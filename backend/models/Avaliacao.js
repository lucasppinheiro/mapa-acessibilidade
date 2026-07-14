const mongoose = require('mongoose');
const { RESOURCE_KEYS, RESOURCE_STATES, CONTENT_STATUSES } = require('../constants/domain');

const observationDefinition = RESOURCE_KEYS.reduce((fields, key) => {
  fields[key] = { type: String, enum: RESOURCE_STATES, default: 'desconhecido' };
  return fields;
}, {});

const avaliacaoSchema = new mongoose.Schema({
  origemSinteticaId: { type: String, unique: true, sparse: true, select: false },
  local: { type: mongoose.Schema.Types.ObjectId, ref: 'Local', required: true, index: true },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  nota: { type: Number, required: true, min: 1, max: 5 },
  comentario: { type: String, required: true, trim: true, maxlength: 1000 },
  observacoesRecursos: {
    type: new mongoose.Schema(observationDefinition, { _id: false }),
    default: () => ({})
  },
  status: { type: String, enum: CONTENT_STATUSES, default: 'pendente', index: true },
  motivoRejeicao: { type: String, default: null, maxlength: 500 },
  moderadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  moderadoEm: { type: Date, default: null },
  arquivadoEm: { type: Date, default: null }
}, { timestamps: true });

avaliacaoSchema.index({ local: 1, autor: 1 }, { unique: true });
avaliacaoSchema.index({ local: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Avaliacao', avaliacaoSchema);
