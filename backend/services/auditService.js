const AuditEvent = require('../models/AuditEvent');

const recordAudit = async ({ req, action, entityType, entityId, before, after, metadata = {}, session }) => {
  const data = {
    ator: req.usuario?._id || null,
    acao: action,
    entidadeTipo: entityType,
    entidadeId: entityId,
    estadoAnterior: before || null,
    estadoPosterior: after || null,
    metadados: metadata,
    requestId: req.requestId
  };
  if (session) return (await AuditEvent.create([data], { session }))[0];
  return AuditEvent.create(data);
};

module.exports = { recordAudit };
