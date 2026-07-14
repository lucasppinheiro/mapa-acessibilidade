const Local = require('../models/Local');
const Avaliacao = require('../models/Avaliacao');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { localDTO } = require('../utils/dtos');
const { RESOURCE_KEYS } = require('../constants/domain');
const { recordAudit } = require('../services/auditService');
const { withTransaction } = require('../services/transactionService');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resourceInput = (resources = {}) => Object.entries(resources).reduce((result, [key, value]) => {
  if (RESOURCE_KEYS.includes(key)) result[key] = value;
  return result;
}, {});

const localInput = (body) => {
  const data = pick(body, ['nome', 'descricao', 'endereco', 'categoria', 'fotos']);
  if (body.localizacao) {
    data.localizacao = {
      type: 'Point',
      coordinates: body.localizacao.coordinates.map(Number)
    };
  }
  if (body.recursos) data.recursos = resourceInput(body.recursos);
  return data;
};

const pagination = (query, max = 50) => {
  const pagina = Math.max(1, Number.parseInt(query.pagina || query.page, 10) || 1);
  const limite = Math.min(max, Math.max(1, Number.parseInt(query.limite || query.limit, 10) || 20));
  return { pagina, limite, skip: (pagina - 1) * limite };
};

const viewportFilter = (bbox) => {
  if (!bbox) return null;
  const values = String(bbox).split(',').map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new AppError(400, 'VIEWPORT_INVALIDO', 'Use bbox=oeste,sul,leste,norte.');
  }
  const [west, south, east, north] = values;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    throw new AppError(400, 'VIEWPORT_INVALIDO', 'Os limites do viewport são inválidos.');
  }
  return {
    $geoWithin: {
      $geometry: {
        type: 'Polygon',
        coordinates: [[
          [west, south], [east, south], [east, north], [west, north], [west, south]
        ]]
      }
    }
  };
};

const viewportFromQuery = (query) => {
  if (query.bbox) return viewportFilter(query.bbox);
  const keys = ['oeste', 'sul', 'leste', 'norte'];
  const provided = keys.filter((key) => query[key] !== undefined);
  if (!provided.length) return null;
  if (provided.length !== keys.length) {
    throw new AppError(400, 'VIEWPORT_INVALIDO', 'Informe oeste, sul, leste e norte juntos.');
  }
  return viewportFilter(keys.map((key) => query[key]).join(','));
};

exports.listarLocais = async (req, res) => {
  const { pagina, limite, skip } = pagination(req.query);
  const filter = { status: 'aprovado' };
  if (req.query.categoria) filter.categoria = req.query.categoria;
  if (req.query.recurso && RESOURCE_KEYS.includes(req.query.recurso)) {
    filter[`recursos.${req.query.recurso}`] = 'presente';
  }
  if (req.query.notaMinima) filter.mediaAvaliacao = { $gte: Number(req.query.notaMinima) };
  if (req.query.busca) {
    const safeSearch = escapeRegex(String(req.query.busca).slice(0, 100));
    filter.$or = [
      { nome: { $regex: safeSearch, $options: 'i' } },
      { endereco: { $regex: safeSearch, $options: 'i' } },
      { descricao: { $regex: safeSearch, $options: 'i' } }
    ];
  }
  const viewport = viewportFromQuery(req.query);
  if (viewport) filter.localizacao = viewport;

  const [locais, total] = await Promise.all([
    Local.find(filter)
      .populate('autor', 'nome avatar bio')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limite),
    Local.countDocuments(filter)
  ]);
  res.json({
    locais: locais.map((local) => localDTO(local)),
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
      temProximaPagina: pagina * limite < total
    }
  });
};

exports.obterLocal = async (req, res) => {
  const local = await Local.findOne({ _id: req.params.id, status: 'aprovado' })
    .populate('autor', 'nome avatar bio');
  if (!local) throw new AppError(404, 'LOCAL_NAO_ENCONTRADO', 'Local não encontrado.');
  const avaliacoes = await Avaliacao.find({ local: local._id, status: 'aprovado' })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ local: localDTO(local, { incluirResumoRecursos: true, avaliacoes }) });
};

exports.criarLocal = async (req, res) => {
  const data = localInput(req.body);
  const local = await Local.create({ ...data, autor: req.usuario._id, status: 'pendente' });
  await local.populate('autor', 'nome avatar bio');
  await recordAudit({
    req,
    action: 'local.criado',
    entityType: 'local',
    entityId: local._id,
    after: { status: 'pendente' }
  });
  res.status(202).json({ id: local.id, status: 'pendente', mensagem: 'Local enviado para moderação.' });
};

exports.atualizarLocal = async (req, res) => {
  const local = await Local.findById(req.params.id);
  if (!local || local.status === 'arquivado') {
    throw new AppError(404, 'LOCAL_NAO_ENCONTRADO', 'Local não encontrado.');
  }
  const privileged = ['moderador', 'admin'].includes(req.usuario.papel);
  if (!privileged && String(local.autor) !== req.usuario.id) {
    throw new AppError(403, 'PERMISSAO_NEGADA', 'Somente o autor ou a moderação pode editar este local.');
  }
  const before = { status: local.status };
  const data = localInput(req.body);
  Object.assign(local, data);
  if (['aprovado', 'rejeitado'].includes(local.status)) {
    local.status = 'pendente';
    local.moderadoPor = null;
    local.moderadoEm = null;
  }
  local.motivoRejeicao = null;
  await local.save();
  await local.populate('autor', 'nome avatar bio');
  await recordAudit({
    req,
    action: 'local.editado',
    entityType: 'local',
    entityId: local._id,
    before,
    after: { status: local.status }
  });
  res.status(202).json({ id: local.id, status: local.status, mensagem: 'Alterações enviadas para moderação.' });
};

exports.arquivarLocal = async (req, res) => {
  await withTransaction(async (session) => {
    const local = await Local.findById(req.params.id).session(session);
    if (!local || local.status === 'arquivado') {
      throw new AppError(404, 'LOCAL_NAO_ENCONTRADO', 'Local não encontrado.');
    }
    const privileged = ['moderador', 'admin'].includes(req.usuario.papel);
    if (!privileged && String(local.autor) !== req.usuario.id) {
      throw new AppError(403, 'PERMISSAO_NEGADA', 'Somente o autor ou a moderação pode arquivar este local.');
    }
    const before = { status: local.status };
    local.status = 'arquivado';
    local.arquivadoEm = new Date();
    await local.save({ session });
    await recordAudit({
      req,
      action: 'local.arquivado',
      entityType: 'local',
      entityId: local._id,
      before,
      after: { status: 'arquivado' },
      session
    });
  });
  res.status(204).send();
};
