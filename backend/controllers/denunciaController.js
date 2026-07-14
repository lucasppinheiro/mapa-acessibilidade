const Local = require('../models/Local');
const Avaliacao = require('../models/Avaliacao');
const Denuncia = require('../models/Denuncia');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { recordAudit } = require('../services/auditService');

exports.criar = async (req, res) => {
  const data = pick(req.body, ['alvoTipo', 'alvoId', 'motivo', 'detalhes']);
  const Model = data.alvoTipo === 'local' ? Local : Avaliacao;
  const target = await Model.exists({ _id: data.alvoId, status: 'aprovado' });
  if (!target) throw new AppError(404, 'CONTEUDO_NAO_ENCONTRADO', 'Conteúdo não encontrado.');
  const duplicate = await Denuncia.exists({
    autor: req.usuario._id,
    alvoTipo: data.alvoTipo,
    alvoId: data.alvoId,
    status: 'pendente'
  });
  if (duplicate) throw new AppError(409, 'DENUNCIA_JA_EXISTE', 'Você já denunciou este conteúdo.');
  const report = await Denuncia.create({ ...data, autor: req.usuario._id });
  await recordAudit({
    req,
    action: 'denuncia.criada',
    entityType: 'denuncia',
    entityId: report._id,
    after: { status: 'pendente', alvoTipo: report.alvoTipo, alvoId: String(report.alvoId) }
  });
  res.status(202).json({ id: report.id, status: report.status, mensagem: 'Denúncia enviada para moderação.' });
};
