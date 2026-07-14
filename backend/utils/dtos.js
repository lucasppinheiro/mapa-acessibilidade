const { RESOURCE_KEYS } = require('../constants/domain');

const idOf = (value) => String(value?._id || value || '');

const usuarioPublicoDTO = (usuario) => usuario ? ({
  id: idOf(usuario),
  nome: usuario.nome,
  avatar: usuario.avatar || null
}) : null;

const usuarioPrivadoDTO = (usuario) => ({
  ...usuarioPublicoDTO(usuario),
  email: usuario.email,
  papel: usuario.papel,
  bio: usuario.bio || ''
});

const avaliacaoDTO = (avaliacao) => ({
  id: idOf(avaliacao),
  localId: idOf(avaliacao.local),
  nota: avaliacao.nota,
  comentario: avaliacao.comentario,
  observacoesRecursos: RESOURCE_KEYS.reduce((result, key) => {
    result[key] = avaliacao.observacoesRecursos?.[key] || 'desconhecido';
    return result;
  }, {}),
  autor: usuarioPublicoDTO(avaliacao.autor),
  criadoEm: avaliacao.createdAt,
  atualizadoEm: avaliacao.updatedAt
});

const resumoRecursos = (local, avaliacoes = []) => RESOURCE_KEYS.reduce((result, key) => {
  const informado = local.recursos?.[key] || 'desconhecido';
  let observacoesPresente = 0;
  let observacoesAusente = 0;
  let ultimaVerificacao = null;
  for (const avaliacao of avaliacoes) {
    const value = avaliacao.observacoesRecursos?.[key];
    if (value === 'presente') observacoesPresente += 1;
    if (value === 'ausente') observacoesAusente += 1;
    if (value && value !== 'desconhecido' && (!ultimaVerificacao || avaliacao.createdAt > ultimaVerificacao)) {
      ultimaVerificacao = avaliacao.createdAt;
    }
  }
  const confirmacoes = informado === 'presente'
    ? observacoesPresente
    : informado === 'ausente' ? observacoesAusente : 0;
  const contestacoes = informado === 'presente'
    ? observacoesAusente
    : informado === 'ausente' ? observacoesPresente : 0;
  result[key] = {
    informado,
    confirmacoes,
    contestacoes,
    observacoesPresente,
    observacoesAusente,
    ultimaVerificacao
  };
  return result;
}, {});

const localDTO = (local, options = {}) => ({
  id: idOf(local),
  nome: local.nome,
  descricao: local.descricao,
  endereco: local.endereco,
  categoria: local.categoria,
  localizacao: {
    type: 'Point',
    coordinates: local.localizacao.coordinates
  },
  recursos: RESOURCE_KEYS.reduce((result, key) => {
    result[key] = local.recursos?.[key] || 'desconhecido';
    return result;
  }, {}),
  resumoAvaliacoes: {
    media: local.mediaAvaliacao ?? null,
    total: local.totalAvaliacoesAprovadas || 0,
    ultimaVerificacao: local.ultimaVerificacao || null
  },
  ...(options.incluirResumoRecursos ? { resumoRecursos: resumoRecursos(local, options.avaliacoes) } : {}),
  autor: usuarioPublicoDTO(local.autor),
  fotos: local.fotos || [],
  criadoEm: local.createdAt,
  atualizadoEm: local.updatedAt
});

module.exports = {
  usuarioPublicoDTO,
  usuarioPrivadoDTO,
  avaliacaoDTO,
  localDTO,
  resumoRecursos
};
