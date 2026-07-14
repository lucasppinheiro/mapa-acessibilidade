const Local = require('../models/Local');
const Avaliacao = require('../models/Avaliacao');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { RESOURCE_KEYS } = require('../constants/domain');
const { avaliacaoDTO } = require('../utils/dtos');
const { recordAudit } = require('../services/auditService');
const { recalcularMedia } = require('../utils/calcularMedia');
const { withTransaction } = require('../services/transactionService');

const observationsDTO = (observations = {}) => RESOURCE_KEYS.reduce((result, key) => {
  result[key] = observations[key] || 'desconhecido';
  return result;
}, {});

const pagination = (query) => {
  const pagina = Math.max(1, Number.parseInt(query.pagina || query.page, 10) || 1);
  const limite = Math.min(50, Math.max(1, Number.parseInt(query.limite || query.limit, 10) || 10));
  return { pagina, limite, skip: (pagina - 1) * limite };
};

exports.listarAvaliacoes = async (req, res) => {
  const localExists = await Local.exists({ _id: req.params.localId, status: 'aprovado' });
  if (!localExists) throw new AppError(404, 'LOCAL_NAO_ENCONTRADO', 'Local não encontrado.');
  const { pagina, limite, skip } = pagination(req.query);
  const filter = { local: req.params.localId, status: 'aprovado' };
  const [reviews, total] = await Promise.all([
    Avaliacao.find(filter)
      .populate('autor', 'nome avatar bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limite),
    Avaliacao.countDocuments(filter)
  ]);
  res.json({
    avaliacoes: reviews.map(avaliacaoDTO),
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
      temProximaPagina: pagina * limite < total
    }
  });
};

exports.criarAvaliacao = async (req, res) => {
  const local = await Local.findOne({ _id: req.params.localId, status: 'aprovado' });
  if (!local) throw new AppError(404, 'LOCAL_NAO_ENCONTRADO', 'Local não encontrado.');
  const existing = await Avaliacao.exists({ local: local._id, autor: req.usuario._id });
  if (existing) {
    throw new AppError(409, 'AVALIACAO_JA_EXISTE', 'Você já enviou uma avaliação para este local.');
  }
  const data = pick(req.body, ['nota', 'comentario']);
  data.observacoesRecursos = observationsDTO(req.body.observacoesRecursos);
  const review = await Avaliacao.create({
    ...data,
    local: local._id,
    autor: req.usuario._id,
    status: 'pendente'
  });
  await review.populate('autor', 'nome avatar bio');
  await recordAudit({
    req,
    action: 'avaliacao.criada',
    entityType: 'avaliacao',
    entityId: review._id,
    after: { status: 'pendente', localId: String(local._id) }
  });
  res.status(202).json({ id: review.id, status: 'pendente', mensagem: 'Avaliação enviada para moderação.' });
};

exports.arquivarAvaliacao = async (req, res) => {
  await withTransaction(async (session) => {
    const review = await Avaliacao.findOne({ _id: req.params.avaliacaoId, local: req.params.localId }).session(session);
    if (!review || review.status === 'arquivado') {
      throw new AppError(404, 'AVALIACAO_NAO_ENCONTRADA', 'Avaliação não encontrada.');
    }
    const privileged = ['moderador', 'admin'].includes(req.usuario.papel);
    if (!privileged && String(review.autor) !== req.usuario.id) {
      throw new AppError(403, 'PERMISSAO_NEGADA', 'Somente o autor ou a moderação pode arquivar esta avaliação.');
    }
    const previousStatus = review.status;
    review.status = 'arquivado';
    review.arquivadoEm = new Date();
    await review.save({ session });
    if (previousStatus === 'aprovado') await recalcularMedia(review.local, session);
    await recordAudit({
      req,
      action: 'avaliacao.arquivada',
      entityType: 'avaliacao',
      entityId: review._id,
      before: { status: previousStatus },
      after: { status: 'arquivado' },
      session
    });
  });
  res.status(204).send();
};
