const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getConfig } = require('./config/env');
const requestContext = require('./middleware/requestContext');
const rateLimitHandler = require('./middleware/rateLimitHandler');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const locaisRoutes = require('./routes/locais');
const avaliacoesRoutes = require('./routes/avaliacoes');
const denunciasRoutes = require('./routes/denuncias');
const moderacaoRoutes = require('./routes/moderacao');
const geocodificacaoRoutes = require('./routes/geocodificacao');

const createApp = () => {
  const config = getConfig();
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(requestContext);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  }));

  if (config.corsOrigins.length) {
    app.use(cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      }
    }));
  }

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('LIMITE_REQUISICOES', 'Muitas requisições. Tente novamente em alguns minutos.')
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('LIMITE_AUTENTICACAO', 'Muitas tentativas. Aguarde antes de tentar novamente.')
  });
  app.get('/api/v1/health/live', (_req, res) => {
    res.json({ status: 'vivo' });
  });
  app.get('/api/v1/health/ready', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json(ready
      ? { status: 'pronto', banco: 'conectado' }
      : { erro: { codigo: 'BANCO_INDISPONIVEL', mensagem: 'Banco de dados indisponível.', requestId: req.requestId } });
  });

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/registro', authLimiter);
  app.use('/api/v1/auth/refresh', authLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/locais/:localId/avaliacoes', avaliacoesRoutes);
  app.use('/api/v1/locais', locaisRoutes);
  app.use('/api/v1/denuncias', denunciasRoutes);
  app.use('/api/v1/moderacao', moderacaoRoutes);
  app.use('/api/v1/geocodificacao', geocodificacaoRoutes);
  app.use('/api/v1', notFound);

  const frontendDirectory = path.resolve(__dirname, '../frontend/dist');
  if (fs.existsSync(frontendDirectory)) {
    app.use(express.static(frontendDirectory, { index: false, maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
    app.get(/^(?!\/api\/v1(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(frontendDirectory, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
};

module.exports = createApp();
module.exports.createApp = createApp;
