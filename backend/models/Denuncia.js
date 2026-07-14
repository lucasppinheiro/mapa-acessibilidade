const mongoose = require('mongoose');

const denunciaSchema = new mongoose.Schema({
  alvoTipo: { type: String, enum: ['local', 'avaliacao'], required: true, index: true },
  alvoId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  motivo: {
    type: String,
    enum: ['informacao_incorreta', 'conteudo_inadequado', 'duplicado', 'outro'],
    required: true
  },
  detalhes: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['pendente', 'resolvida', 'arquivada'], default: 'pendente', index: true },
  resolvidaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvidaEm: { type: Date, default: null },
  resolucao: { type: String, default: null, maxlength: 500 }
}, { timestamps: true });

denunciaSchema.index({ autor: 1, alvoTipo: 1, alvoId: 1, status: 1 });

module.exports = mongoose.model('Denuncia', denunciaSchema);
