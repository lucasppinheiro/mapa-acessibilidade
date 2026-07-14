const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

module.exports = (req, _res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(new AppError(
      422,
      'DADOS_INVALIDOS',
      'Revise os campos informados.',
      result.array({ onlyFirstError: true }).map((item) => ({
        campo: item.path,
        mensagem: item.msg
      }))
    ));
  }
  next();
};
