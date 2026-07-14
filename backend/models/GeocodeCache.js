const mongoose = require('mongoose');

const geocodeCacheSchema = new mongoose.Schema({
  chave: { type: String, required: true, unique: true, index: true },
  resultados: { type: [mongoose.Schema.Types.Mixed], default: [] },
  expiraEm: { type: Date, required: true }
}, { timestamps: true });

geocodeCacheSchema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GeocodeCache', geocodeCacheSchema);
