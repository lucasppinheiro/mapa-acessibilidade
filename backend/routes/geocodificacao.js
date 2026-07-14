const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('express-validator');
const controller = require('../controllers/geocodificacaoController');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const rateLimitHandler = require('../middleware/rateLimitHandler');

const router = express.Router();
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('LIMITE_GEOCODIFICACAO', 'Aguarde antes de fazer uma nova busca de endereço.')
});

router.get('/', searchLimiter, [
  query('q').trim().isLength({ min: 3, max: 200 }).withMessage('Informe um endereço entre 3 e 200 caracteres.'),
  validate
], asyncHandler(controller.buscar));

module.exports = router;
