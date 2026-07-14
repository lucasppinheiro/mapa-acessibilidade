const { createHash, randomBytes, randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const { getConfig } = require('../config/env');

const COOKIE_NAME = 'acessamapa_refresh';

const hashValue = (value) => createHash('sha256').update(value).digest('hex');

const cookieOptions = () => {
  const config = getConfig();
  return {
    httpOnly: true,
    secure: config.refreshCookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000
  };
};

const createAccessToken = (usuario, sessionId) => jwt.sign(
  { papel: usuario.papel, sid: sessionId, tipo: 'access' },
  getConfig().accessTokenSecret,
  {
    subject: usuario.id,
    expiresIn: getConfig().accessTokenTtl,
    algorithm: 'HS256',
    issuer: 'acessamapa-api',
    audience: 'acessamapa-web'
  }
);

const sessionMetadata = (req) => ({
  userAgent: String(req.get('user-agent') || '').slice(0, 300),
  ipHash: req.ip ? hashValue(`${getConfig().accessTokenSecret}:${req.ip}`) : ''
});

const createSession = async (usuario, req, familiaId = randomUUID()) => {
  const refreshToken = randomBytes(32).toString('base64url');
  const config = getConfig();
  const session = await Session.create({
    usuario: usuario._id,
    tokenHash: hashValue(refreshToken),
    familiaId,
    expiraEm: new Date(Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000),
    ...sessionMetadata(req)
  });
  return {
    refreshToken,
    accessToken: createAccessToken(usuario, session.id),
    session
  };
};

const revokeAllForUser = (userId, reason, session) => Session.updateMany(
  { usuario: userId, revogadoEm: null },
  { $set: { revogadoEm: new Date(), motivoRevogacao: reason } },
  session ? { session } : undefined
);

const revokeFamily = (familiaId, reason) => Session.updateMany(
  { familiaId, revogadoEm: null },
  { $set: { revogadoEm: new Date(), motivoRevogacao: reason } }
);

const rotateSession = async (refreshToken, req) => {
  if (!refreshToken) {
    throw new AppError(401, 'REFRESH_TOKEN_AUSENTE', 'A sessão não pôde ser renovada.');
  }
  const tokenHash = hashValue(refreshToken);
  const current = await Session.findOne({ tokenHash }).populate('usuario');
  if (!current) {
    throw new AppError(401, 'REFRESH_TOKEN_INVALIDO', 'A sessão não pôde ser renovada.');
  }
  if (!current.usuario) {
    throw new AppError(401, 'USUARIO_INATIVO', 'A conta não está disponível.');
  }
  if (current.revogadoEm) {
    if (current.substituidoPorHash) {
      await revokeFamily(current.familiaId, 'reutilizacao_detectada');
      throw new AppError(
        401,
        'REUTILIZACAO_REFRESH_TOKEN',
        'A sessão foi revogada por segurança. Faça login novamente.'
      );
    }
    throw new AppError(401, 'SESSAO_REVOGADA', 'A sessão foi encerrada. Faça login novamente.');
  }
  if (current.expiraEm <= new Date() || current.usuario.excluidoEm) {
    current.revogadoEm = new Date();
    current.motivoRevogacao = 'expirada';
    await current.save();
    throw new AppError(401, 'REFRESH_TOKEN_EXPIRADO', 'A sessão expirou. Faça login novamente.');
  }

  const nextToken = randomBytes(32).toString('base64url');
  const nextHash = hashValue(nextToken);
  const rotated = await Session.findOneAndUpdate(
    { _id: current._id, revogadoEm: null },
    {
      $set: {
        revogadoEm: new Date(),
        motivoRevogacao: 'rotacao',
        substituidoPorHash: nextHash
      }
    },
    { new: true }
  );
  if (!rotated) {
    await revokeFamily(current.familiaId, 'reutilizacao_detectada');
    throw new AppError(401, 'REUTILIZACAO_REFRESH_TOKEN', 'A sessão foi revogada por segurança.');
  }

  const config = getConfig();
  const nextSession = await Session.create({
    usuario: current.usuario._id,
    tokenHash: nextHash,
    familiaId: current.familiaId,
    expiraEm: new Date(Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000),
    ...sessionMetadata(req)
  });
  return {
    refreshToken: nextToken,
    accessToken: createAccessToken(current.usuario, nextSession.id),
    usuario: current.usuario
  };
};

const setRefreshCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOptions());
const clearRefreshCookie = (res) => res.clearCookie(COOKIE_NAME, {
  ...cookieOptions(),
  maxAge: undefined
});

module.exports = {
  COOKIE_NAME,
  hashValue,
  createSession,
  rotateSession,
  revokeAllForUser,
  revokeFamily,
  setRefreshCookie,
  clearRefreshCookie
};
