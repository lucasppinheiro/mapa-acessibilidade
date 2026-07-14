const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  familiaId: { type: String, required: true, index: true },
  expiraEm: { type: Date, required: true },
  revogadoEm: { type: Date, default: null, index: true },
  motivoRevogacao: { type: String, default: null },
  substituidoPorHash: { type: String, default: null },
  userAgent: { type: String, default: '', maxlength: 300 },
  ipHash: { type: String, default: '' }
}, { timestamps: true });

sessionSchema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ usuario: 1, revogadoEm: 1 });

module.exports = mongoose.model('Session', sessionSchema);
