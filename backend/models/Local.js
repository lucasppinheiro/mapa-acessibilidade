const mongoose = require('mongoose');
const {
  RESOURCE_KEYS,
  RESOURCE_STATES,
  CATEGORIES,
  CONTENT_STATUSES
} = require('../constants/domain');

const resourceDefinition = RESOURCE_KEYS.reduce((fields, key) => {
  fields[key] = { type: String, enum: RESOURCE_STATES, default: 'desconhecido' };
  return fields;
}, {});

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator(value) {
        return Array.isArray(value)
          && value.length === 2
          && value[0] >= -180 && value[0] <= 180
          && value[1] >= -90 && value[1] <= 90;
      },
      message: 'Coordenadas GeoJSON inválidas.'
    }
  }
}, { _id: false });

const localSchema = new mongoose.Schema({
  origemSinteticaId: { type: String, unique: true, sparse: true, select: false },
  nome: { type: String, required: true, trim: true, maxlength: 200 },
  descricao: { type: String, required: true, trim: true, maxlength: 1000 },
  endereco: { type: String, required: true, trim: true, maxlength: 300 },
  categoria: { type: String, required: true, enum: CATEGORIES, index: true },
  localizacao: { type: pointSchema, required: true },
  recursos: { type: new mongoose.Schema(resourceDefinition, { _id: false }), default: () => ({}) },
  mediaAvaliacao: { type: Number, min: 1, max: 5, default: null },
  totalAvaliacoesAprovadas: { type: Number, min: 0, default: 0 },
  ultimaVerificacao: { type: Date, default: null },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fotos: [{ type: String, maxlength: 500 }],
  status: { type: String, enum: CONTENT_STATUSES, default: 'pendente', index: true },
  motivoRejeicao: { type: String, default: null, maxlength: 500 },
  moderadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  moderadoEm: { type: Date, default: null },
  arquivadoEm: { type: Date, default: null }
}, { timestamps: true });

localSchema.index({ localizacao: '2dsphere' });
localSchema.index({ status: 1, categoria: 1, createdAt: -1 });
localSchema.index({ status: 1, mediaAvaliacao: -1 });

module.exports = mongoose.model('Local', localSchema);
