export const idDe = (valor) => valor?._id || valor?.id || valor;

export const autorDe = (item) => item?.autor || { nome: 'Pessoa da comunidade' };

export const coordenadasDe = (local) => {
  const coordinates = local?.localizacao?.coordinates || local?.coordenadas?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return { lat: Number(coordinates[1]), lng: Number(coordinates[0]) };
  }
  if (local?.coordenadas?.lat !== undefined) {
    return { lat: Number(local.coordenadas.lat), lng: Number(local.coordenadas.lng) };
  }
  return null;
};

export const mediaDe = (localOuResumo) => {
  const resumo = localOuResumo?.resumoAvaliacoes || localOuResumo;
  const media = resumo?.media ?? localOuResumo?.mediaAvaliacoes ?? localOuResumo?.notaAcessibilidade;
  if (media === null || media === undefined || media === '') return null;
  return Number.isFinite(Number(media)) ? Number(media) : null;
};

export const totalAvaliacoesDe = (localOuResumo) => {
  const resumo = localOuResumo?.resumoAvaliacoes || localOuResumo;
  return Number(resumo?.total ?? localOuResumo?.totalAvaliacoes ?? 0);
};

export const estadoRecursoDe = (valor) => {
  if (['presente', 'ausente', 'desconhecido'].includes(valor)) return valor;
  if (valor === true) return 'presente';
  return 'desconhecido';
};

export const dataFormatada = (valor) => {
  if (!valor) return 'data não informada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'data não informada';
  return new Intl.DateTimeFormat('pt-BR').format(data);
};

export const detalhesErro = (error) => error.response?.data?.erro?.detalhes || [];

export const errosDeCampos = (error, aliases = {}) => Object.fromEntries(
  detalhesErro(error).map((detalhe) => [aliases[detalhe.campo] || detalhe.campo, detalhe.mensagem])
);
