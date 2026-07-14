const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  ator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  acao: { type: String, required: true, index: true },
  entidadeTipo: { type: String, required: true, index: true },
  entidadeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  estadoAnterior: { type: mongoose.Schema.Types.Mixed, default: null },
  estadoPosterior: { type: mongoose.Schema.Types.Mixed, default: null },
  metadados: { type: mongoose.Schema.Types.Mixed, default: {} },
  requestId: { type: String, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditEventSchema.pre(/^(update|replace|delete)/, function prohibitMutation() {
  throw new Error('Eventos de auditoria são append-only.');
});

auditEventSchema.index({ entidadeTipo: 1, entidadeId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
