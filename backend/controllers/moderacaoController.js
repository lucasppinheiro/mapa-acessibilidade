const Local = require('../models/Local');
const Avaliacao = require('../models/Avaliacao');
const Denuncia = require('../models/Denuncia');
const AuditEvent = require('../models/AuditEvent');
const AppError = require('../utils/AppError');
const { localDTO, avaliacaoDTO, usuarioPublicoDTO } = require('../utils/dtos');
const { recordAudit } = require('../services/auditService');
const { recalcularMedia } = require('../utils/calcularMedia');
const { withTransaction } = require('../services/transactionService');

const modelFor = (type) => {
  if (type === 'local') return Local;
  if (type === 'avaliacao') return Avaliacao;
  if (type === 'denuncia') return Denuncia;
  throw new AppError(400, 'TIPO_MODERACAO_INVALIDO', 'Tipo de conteúdo inválido.');
};

const moderationItem = (type, document) => ({
  tipo: type,
  id: document.id,
  conteudo: type === 'local' ? localDTO(document) : avaliacaoDTO(document),
  status: document.status,
  submetidoEm: document.updatedAt
});

exports.fila = async (req, res) => {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(50, Math.max(1, Number.parseInt(req.query.limite, 10) || 20));
  const skip = (pagina - 1) * limite;
  const requestedType = req.query.tipo;
  let items = [];
  let total = 0;

  if (requestedType === 'local' || !requestedType) {
    const [documents, count] = await Promise.all([
      Local.find({ status: 'pendente' }).populate('autor', 'nome avatar bio').sort({ updatedAt: 1 }),
      Local.countDocuments({ status: 'pendente' })
    ]);
    items.push(...documents.map((document) => moderationItem('local', document)));
    total += count;
  }
  if (requestedType === 'avaliacao' || !requestedType) {
    const [documents, count] = await Promise.all([
      Avaliacao.find({ status: 'pendente' }).populate('autor', 'nome avatar bio').sort({ updatedAt: 1 }),
      Avaliacao.countDocuments({ status: 'pendente' })
    ]);
    items.push(...documents.map((document) => moderationItem('avaliacao', document)));
    total += count;
  }
  if (requestedType === 'denuncia' || !requestedType) {
    const [documents, count] = await Promise.all([
      Denuncia.find({ status: 'pendente' }).sort({ createdAt: 1 }).lean(),
      Denuncia.countDocuments({ status: 'pendente' })
    ]);
    items.push(...documents.map((document) => ({
      tipo: 'denuncia',
      id: String(document._id),
      conteudo: {
        alvoTipo: document.alvoTipo,
        alvoId: String(document.alvoId),
        motivo: document.motivo,
        detalhes: document.detalhes
      },
      status: document.status,
      submetidoEm: document.createdAt
    })));
    total += count;
  }
  items.sort((a, b) => new Date(a.submetidoEm) - new Date(b.submetidoEm));
  items = items.slice(skip, skip + limite);
  res.json({
    itens: items,
    paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite), temProximaPagina: pagina * limite < total }
  });
};

exports.aprovar = async (req, res) => {
  const Model = modelFor(req.params.tipo);
  const result = await withTransaction(async (session) => {
    const document = await Model.findById(req.params.id).session(session);
    if (!document || document.status !== 'pendente') {
      throw new AppError(404, 'ITEM_MODERACAO_NAO_ENCONTRADO', 'Item pendente não encontrado.');
    }
    const nextStatus = req.params.tipo === 'denuncia' ? 'resolvida' : 'aprovado';
    document.status = nextStatus;
    if (req.params.tipo === 'denuncia') {
      document.resolvidaPor = req.usuario._id;
      document.resolvidaEm = new Date();
      document.resolucao = 'Denúncia analisada pela moderação.';
    } else {
      document.motivoRejeicao = null;
      document.moderadoPor = req.usuario._id;
      document.moderadoEm = new Date();
    }
    await document.save({ session });
    if (req.params.tipo === 'avaliacao') await recalcularMedia(document.local, session);
    await recordAudit({
      req,
      action: `${req.params.tipo}.aprovado`,
      entityType: req.params.tipo,
      entityId: document._id,
      before: { status: 'pendente' },
      after: { status: nextStatus },
      session
    });
    return { id: document.id, status: nextStatus };
  });
  res.json({ moderacao: { tipo: req.params.tipo, ...result } });
};

exports.rejeitar = async (req, res) => {
  const Model = modelFor(req.params.tipo);
  const result = await withTransaction(async (session) => {
    const document = await Model.findById(req.params.id).session(session);
    if (!document || document.status !== 'pendente') {
      throw new AppError(404, 'ITEM_MODERACAO_NAO_ENCONTRADO', 'Item pendente não encontrado.');
    }
    const nextStatus = req.params.tipo === 'denuncia' ? 'arquivada' : 'rejeitado';
    document.status = nextStatus;
    if (req.params.tipo === 'denuncia') {
      document.resolvidaPor = req.usuario._id;
      document.resolvidaEm = new Date();
      document.resolucao = req.body.motivo;
    } else {
      document.motivoRejeicao = req.body.motivo;
      document.moderadoPor = req.usuario._id;
      document.moderadoEm = new Date();
    }
    await document.save({ session });
    if (req.params.tipo === 'avaliacao') await recalcularMedia(document.local, session);
    await recordAudit({
      req,
      action: `${req.params.tipo}.rejeitado`,
      entityType: req.params.tipo,
      entityId: document._id,
      before: { status: 'pendente' },
      after: { status: nextStatus },
      metadata: { motivo: req.body.motivo },
      session
    });
    return { id: document.id, status: nextStatus };
  });
  res.json({ moderacao: { tipo: req.params.tipo, ...result, motivo: req.body.motivo } });
};

exports.historico = async (req, res) => {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(100, Math.max(1, Number.parseInt(req.query.limite, 10) || 30));
  const skip = (pagina - 1) * limite;
  const filter = {};
  if (req.query.entidadeTipo) filter.entidadeTipo = req.query.entidadeTipo;
  if (req.query.entidadeId) filter.entidadeId = req.query.entidadeId;
  const [events, total] = await Promise.all([
    AuditEvent.find(filter).populate('ator', 'nome avatar bio').sort({ createdAt: -1 }).skip(skip).limit(limite),
    AuditEvent.countDocuments(filter)
  ]);
  res.json({
    eventos: events.map((event) => ({
      id: event.id,
      acao: event.acao,
      entidadeTipo: event.entidadeTipo,
      entidadeId: String(event.entidadeId),
      ator: usuarioPublicoDTO(event.ator),
      estadoAnterior: event.estadoAnterior,
      estadoPosterior: event.estadoPosterior,
      metadados: event.metadados,
      criadoEm: event.createdAt
    })),
    paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite), temProximaPagina: pagina * limite < total }
  });
};
