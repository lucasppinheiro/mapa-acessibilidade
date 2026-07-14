const RESOURCE_KEYS = [
  'rampa',
  'elevador',
  'banheiroAcessivel',
  'pisoTatil',
  'sinalizacaoBraile',
  'estacionamentoAcessivel',
  'portaLarga',
  'libras',
  'audioDescricao',
  'caoPermitido'
];

const RESOURCE_STATES = ['presente', 'ausente', 'desconhecido'];
const CATEGORIES = [
  'restaurante', 'hospital', 'escola', 'mercado', 'transporte',
  'lazer', 'servico_publico', 'comercio', 'hotel', 'outro'
];
const CONTENT_STATUSES = ['pendente', 'aprovado', 'rejeitado', 'arquivado'];
const USER_ROLES = ['usuario', 'moderador', 'admin'];

module.exports = {
  RESOURCE_KEYS,
  RESOURCE_STATES,
  CATEGORIES,
  CONTENT_STATUSES,
  USER_ROLES
};
