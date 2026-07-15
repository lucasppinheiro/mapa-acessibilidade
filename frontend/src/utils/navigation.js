const numeroNoIntervalo = (valor, minimo, maximo) => {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
};

export const normalizarResultadosGeocodificacao = (data) => (
  data?.resultados || data?.itens || (Array.isArray(data) ? data : [])
);

export const normalizarPreenchimentoLocal = (valor) => {
  const endereco = typeof valor?.endereco === 'string' ? valor.endereco.trim().slice(0, 300) : '';
  const latitude = numeroNoIntervalo(valor?.latitude, -90, 90);
  const longitude = numeroNoIntervalo(valor?.longitude, -180, 180);

  if (!endereco || latitude === null || longitude === null) return null;
  return { endereco, latitude: String(latitude), longitude: String(longitude) };
};

export const preenchimentoDeResultadoGeocodificacao = (item) => {
  const [longitudeGeo, latitudeGeo] = item?.localizacao?.coordinates || [];
  return normalizarPreenchimentoLocal({
    endereco: item?.endereco || item?.nome || item?.display_name,
    latitude: latitudeGeo ?? item?.latitude ?? item?.lat,
    longitude: longitudeGeo ?? item?.longitude ?? item?.lon ?? item?.lng
  });
};

export const estadoRetornoSeguro = (valor) => {
  const destinoInformado = typeof valor?.destino === 'string' ? valor.destino : '';
  const destino = destinoInformado === '/novo-local' || /^\/local\/[A-Za-z0-9_-]+$/.test(destinoInformado)
    ? destinoInformado
    : '/';
  const preenchimentoLocal = destino === '/novo-local'
    ? normalizarPreenchimentoLocal(valor?.preenchimentoLocal)
    : null;

  return {
    destino,
    ...(preenchimentoLocal ? { preenchimentoLocal } : {})
  };
};
