const { randomUUID } = require('crypto');

const requestContext = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.requestId = incoming && /^[A-Za-z0-9._-]{1,100}$/.test(incoming)
    ? incoming
    : randomUUID();
  req.startedAt = process.hrtime.bigint();
  res.setHeader('x-request-id', req.requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1e6;
    console.info(JSON.stringify({
      nivel: 'info',
      evento: 'http_request',
      requestId: req.requestId,
      metodo: req.method,
      caminho: req.originalUrl.split('?')[0],
      status: res.statusCode,
      duracaoMs: Math.round(durationMs * 100) / 100
    }));
  });
  next();
};

module.exports = requestContext;
