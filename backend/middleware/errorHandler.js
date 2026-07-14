const errorBody = (req, codigo, mensagem, detalhes) => ({
  erro: {
    codigo,
    mensagem,
    ...(detalhes ? { detalhes } : {}),
    requestId: req.requestId
  }
});

const notFound = (req, res) => {
  res.status(404).json(errorBody(req, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.'));
};

const errorHandler = (err, req, res, _next) => {
  let status = err.statusCode || 500;
  let codigo = err.codigo || 'ERRO_INTERNO';
  let mensagem = err.message;
  let detalhes = err.detalhes;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    codigo = 'JSON_INVALIDO';
    mensagem = 'O corpo da requisição contém JSON inválido.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    codigo = 'CORPO_MUITO_GRANDE';
    mensagem = 'O corpo da requisição excede o limite permitido.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    codigo = 'DADOS_INVALIDOS';
    mensagem = 'Os dados enviados são inválidos.';
    detalhes = Object.values(err.errors).map((item) => ({ campo: item.path, mensagem: item.message }));
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') {
    status = 400;
    codigo = 'ID_INVALIDO';
    mensagem = 'O identificador informado é inválido.';
  } else if (err.code === 11000) {
    status = 409;
    codigo = 'REGISTRO_DUPLICADO';
    mensagem = 'Já existe um registro com estes dados.';
  }

  if (status >= 500) {
    const operational = err.name === 'AppError';
    const log = operational ? console.warn : console.error;
    log(JSON.stringify({
      nivel: operational ? 'warn' : 'error',
      evento: 'request_error',
      requestId: req.requestId,
      codigo,
      mensagem: err.message,
      stack: !operational && process.env.NODE_ENV !== 'production' ? err.stack : undefined
    }));
    if (!operational) mensagem = 'Ocorreu um erro interno. Tente novamente.';
  }

  res.status(status).json(errorBody(req, codigo, mensagem, detalhes));
};

module.exports = { errorHandler, errorBody, notFound };
