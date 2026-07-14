const { createHash } = require('crypto');
const GeocodeCache = require('../models/GeocodeCache');
const AppError = require('../utils/AppError');
const { getConfig } = require('../config/env');

let providerQueue = Promise.resolve();
let nextProviderRequestAt = 0;

const normalizeQuery = (query) => query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const cacheKey = (query) => createHash('sha256').update(query).digest('hex');

const scheduleProviderRequest = (task) => {
  const scheduled = providerQueue.then(async () => {
    const waitMs = Math.max(0, nextProviderRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextProviderRequestAt = Date.now() + 1100;
    return task();
  });
  providerQueue = scheduled.catch(() => undefined);
  return scheduled;
};

const fetchNominatim = async (query) => {
  const config = getConfig();
  const url = new URL('/search', config.geocodingBaseUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  const response = await fetch(url, {
    headers: {
      'User-Agent': config.geocodingUserAgent,
      'Accept-Language': 'pt-BR,pt;q=0.9',
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    throw new AppError(502, 'PROVEDOR_GEOCODIFICACAO_INDISPONIVEL', 'A busca de endereço está indisponível.');
  }
  try {
    const data = await response.json();
    return data.slice(0, 5).map((item) => ({
      id: String(item.place_id),
      endereco: item.display_name,
      localizacao: { type: 'Point', coordinates: [Number(item.lon), Number(item.lat)] },
      atribuicao: '© OpenStreetMap contributors'
    }));
  } catch (_error) {
    throw new AppError(502, 'RESPOSTA_GEOCODIFICACAO_INVALIDA', 'A busca de endereço está indisponível.');
  }
};

const searchAddress = async (query) => {
  const config = getConfig();
  if (config.geocodingProvider !== 'nominatim') {
    throw new AppError(503, 'PROVEDOR_GEOCODIFICACAO_INVALIDO', 'Provedor de geocodificação não configurado.');
  }
  const normalized = normalizeQuery(query);
  const key = cacheKey(normalized);
  const cached = await GeocodeCache.findOne({ chave: key, expiraEm: { $gt: new Date() } }).lean();
  if (cached) return { resultados: cached.resultados, cache: true };
  let results;
  try {
    results = await scheduleProviderRequest(() => fetchNominatim(normalized));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'PROVEDOR_GEOCODIFICACAO_INDISPONIVEL', 'A busca de endereço está indisponível.');
  }
  await GeocodeCache.findOneAndUpdate(
    { chave: key },
    {
      $set: {
        resultados: results,
        expiraEm: new Date(Date.now() + config.geocodingCacheDays * 24 * 60 * 60 * 1000)
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { resultados: results, cache: false };
};

module.exports = { searchAddress, normalizeQuery, scheduleProviderRequest };
