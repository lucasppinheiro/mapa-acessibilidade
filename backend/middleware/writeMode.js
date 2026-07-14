const AppError = require('../utils/AppError');
const { getConfig } = require('../config/env');

module.exports = (_req, _res, next) => {
  if (getConfig().demoWriteMode === 'read_only') {
    return next(new AppError(
      503,
      'DEMO_SOMENTE_LEITURA',
      'A demonstração está temporariamente em modo somente leitura.'
    ));
  }
  next();
};
