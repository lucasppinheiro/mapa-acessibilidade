const parseBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getConfig = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePositiveInteger(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenDays: parsePositiveInteger(process.env.REFRESH_TOKEN_DAYS, 30),
  refreshCookieSecure: parseBoolean(
    process.env.REFRESH_COOKIE_SECURE,
    process.env.NODE_ENV === 'production'
  ),
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean)
    : [],
  demoWriteMode: process.env.DEMO_WRITE_MODE || 'moderated',
  geocodingProvider: process.env.GEOCODING_PROVIDER || 'nominatim',
  geocodingBaseUrl: process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org',
  geocodingUserAgent: process.env.GEOCODING_USER_AGENT || 'AcessaMapa/1.0 (https://github.com/lucasppinheiro/mapa-acessibilidade)',
  geocodingCacheDays: parsePositiveInteger(process.env.GEOCODING_CACHE_DAYS, 30),
  trustProxy: parsePositiveInteger(process.env.TRUST_PROXY, 0)
});

const validateRuntimeConfig = (config) => {
  const missing = ['mongodbUri', 'accessTokenSecret'].filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }
  if (!['moderated', 'read_only'].includes(config.demoWriteMode)) {
    throw new Error('DEMO_WRITE_MODE deve ser "moderated" ou "read_only".');
  }
  if (config.nodeEnv === 'production' && config.accessTokenSecret.length < 32) {
    throw new Error('ACCESS_TOKEN_SECRET deve ter pelo menos 32 caracteres em produção.');
  }
};

module.exports = { getConfig, validateRuntimeConfig };
