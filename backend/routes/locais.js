const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/localController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const writeMode = require('../middleware/writeMode');
const asyncHandler = require('../utils/asyncHandler');
const { RESOURCE_KEYS, RESOURCE_STATES, CATEGORIES } = require('../constants/domain');

const router = express.Router();

const validateResources = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Recursos deve ser um objeto.');
  for (const [key, state] of Object.entries(value)) {
    if (!RESOURCE_KEYS.includes(key) || !RESOURCE_STATES.includes(state)) {
      throw new Error(`Recurso inválido: ${key}.`);
    }
  }
  return true;
};

const validateCoordinates = (value) => Array.isArray(value)
  && value.length === 2
  && Number.isFinite(Number(value[0]))
  && Number.isFinite(Number(value[1]))
  && Number(value[0]) >= -180 && Number(value[0]) <= 180
  && Number(value[1]) >= -90 && Number(value[1]) <= 90;

const createRules = [
  body('nome').trim().isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres.'),
  body('descricao').trim().isLength({ min: 10, max: 1000 }).withMessage('Descrição deve ter entre 10 e 1000 caracteres.'),
  body('endereco').trim().isLength({ min: 5, max: 300 }).withMessage('Endereço deve ter entre 5 e 300 caracteres.'),
  body('categoria').isIn(CATEGORIES).withMessage('Categoria inválida.'),
  body('localizacao.coordinates').custom(validateCoordinates).withMessage('Informe longitude e latitude válidas.'),
  body('recursos').optional().custom(validateResources),
  body('fotos').optional().isArray({ max: 5 }).withMessage('Envie no máximo cinco fotos.'),
  body('fotos.*').optional().isURL({ protocols: ['https'], require_protocol: true }).withMessage('Fotos devem usar URLs HTTPS.'),
  validate
];

const updateRules = [
  body('nome').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Nome inválido.'),
  body('descricao').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Descrição inválida.'),
  body('endereco').optional().trim().isLength({ min: 5, max: 300 }).withMessage('Endereço inválido.'),
  body('categoria').optional().isIn(CATEGORIES).withMessage('Categoria inválida.'),
  body('localizacao.coordinates').optional().custom(validateCoordinates).withMessage('Coordenadas inválidas.'),
  body('localizacao').optional().custom((value) => validateCoordinates(value?.coordinates)).withMessage('Localização inválida.'),
  body('recursos').optional().custom(validateResources),
  body('fotos').optional().isArray({ max: 5 }).withMessage('Envie no máximo cinco fotos.'),
  body('fotos.*').optional().isURL({ protocols: ['https'], require_protocol: true }).withMessage('Fotos devem usar URLs HTTPS.'),
  validate
];

router.get('/', [
  query('categoria').optional().isIn(CATEGORIES).withMessage('Categoria inválida.'),
  query('recurso').optional().isIn(RESOURCE_KEYS).withMessage('Recurso inválido.'),
  query('notaMinima').optional().isFloat({ min: 1, max: 5 }).withMessage('Nota mínima inválida.'),
  query('busca').optional().isLength({ max: 100 }).withMessage('Busca muito longa.'),
  query('oeste').optional().isFloat({ min: -180, max: 180 }).withMessage('Oeste inválido.'),
  query('sul').optional().isFloat({ min: -90, max: 90 }).withMessage('Sul inválido.'),
  query('leste').optional().isFloat({ min: -180, max: 180 }).withMessage('Leste inválido.'),
  query('norte').optional().isFloat({ min: -90, max: 90 }).withMessage('Norte inválido.'),
  validate
], asyncHandler(controller.listarLocais));
router.post('/', auth, writeMode, createRules, asyncHandler(controller.criarLocal));
router.get('/:id', [param('id').isMongoId().withMessage('ID inválido.'), validate], asyncHandler(controller.obterLocal));
router.patch('/:id', auth, writeMode, [param('id').isMongoId().withMessage('ID inválido.'), validate], updateRules, asyncHandler(controller.atualizarLocal));
router.delete('/:id', auth, writeMode, [param('id').isMongoId().withMessage('ID inválido.'), validate], asyncHandler(controller.arquivarLocal));

module.exports = router;
