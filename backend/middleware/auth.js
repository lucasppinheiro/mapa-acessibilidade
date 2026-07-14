const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const { getConfig } = require('../config/env');

const auth = async (req, _res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'TOKEN_NAO_FORNECIDO', 'Faça login para continuar.');
    }

    let payload;
    try {
      payload = jwt.verify(token, getConfig().accessTokenSecret, {
        algorithms: ['HS256'],
        issuer: 'acessamapa-api',
        audience: 'acessamapa-web'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(401, 'TOKEN_EXPIRADO', 'Sua sessão expirou. Renove o acesso.');
      }
      throw new AppError(401, 'TOKEN_INVALIDO', 'O token de acesso é inválido.');
    }

    if (!payload.sub || payload.tipo !== 'access') {
      throw new AppError(401, 'TOKEN_INVALIDO', 'O token de acesso é inválido.');
    }

    const [usuario, session] = await Promise.all([
      User.findOne({ _id: payload.sub, excluidoEm: null }),
      Session.findOne({
        _id: payload.sid,
        usuario: payload.sub,
        revogadoEm: null,
        expiraEm: { $gt: new Date() }
      }).select('_id')
    ]);
    if (!usuario) {
      throw new AppError(401, 'USUARIO_INATIVO', 'A conta não está disponível.');
    }
    if (!session) {
      throw new AppError(401, 'SESSAO_REVOGADA', 'A sessão foi encerrada. Faça login novamente.');
    }

    req.usuario = usuario;
    req.sessionId = payload.sid;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => (req, _res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.papel)) {
    return next(new AppError(403, 'PERMISSAO_NEGADA', 'Você não tem permissão para esta ação.'));
  }
  next();
};

module.exports = auth;
module.exports.authorize = authorize;
