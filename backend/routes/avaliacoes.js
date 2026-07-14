const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/avaliacaoController');
const auth = require('../middleware/auth');
const writeMode = require('../middleware/writeMode');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { RESOURCE_KEYS, RESOURCE_STATES } = require('../constants/domain');
const rateLimitHandler = require('../middleware/rateLimitHandler');

const router = express.Router({ mergeParams: true });

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('LIMITE_AVALIACOES', 'Você atingiu o limite de avaliações. Tente novamente mais tarde.')
});

const validateObservations = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Observações devem ser um objeto.');
  for (const [key, state] of Object.entries(value)) {
    if (!RESOURCE_KEYS.includes(key) || !RESOURCE_STATES.includes(state)) {
      throw new Error(`Observação inválida: ${key}.`);
    }
  }
  return true;
};

const localIdRule = param('localId').isMongoId().withMessage('ID de local inválido.');

router.get('/', [localIdRule, validate], asyncHandler(controller.listarAvaliacoes));
router.post('/', auth, writeMode, reviewLimiter, [
  localIdRule,
  body('nota').isInt({ min: 1, max: 5 }).withMessage('A nota deve ser um inteiro entre 1 e 5.'),
  body('comentario').trim().isLength({ min: 10, max: 1000 }).withMessage('Comentário deve ter entre 10 e 1000 caracteres.'),
  body('observacoesRecursos').optional().custom(validateObservations),
  validate
], asyncHandler(controller.criarAvaliacao));
router.delete('/:avaliacaoId', auth, writeMode, [
  localIdRule,
  param('avaliacaoId').isMongoId().withMessage('ID de avaliação inválido.'),
  validate
], asyncHandler(controller.arquivarAvaliacao));

module.exports = router;
