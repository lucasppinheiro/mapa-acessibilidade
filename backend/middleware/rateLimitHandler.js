const { errorBody } = require('./errorHandler');

const rateLimitHandler = (codigo, mensagem) => (req, res) => {
  res.status(429).json(errorBody(req, codigo, mensagem));
};

module.exports = rateLimitHandler;
