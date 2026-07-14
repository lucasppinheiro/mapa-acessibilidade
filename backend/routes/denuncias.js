const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/denunciaController');
const auth = require('../middleware/auth');
const writeMode = require('../middleware/writeMode');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.post('/', auth, writeMode, [
  body('alvoTipo').isIn(['local', 'avaliacao']).withMessage('Tipo de conteúdo inválido.'),
  body('alvoId').isMongoId().withMessage('ID de conteúdo inválido.'),
  body('motivo').isIn(['informacao_incorreta', 'conteudo_inadequado', 'duplicado', 'outro']).withMessage('Motivo inválido.'),
  body('detalhes').optional().trim().isLength({ max: 1000 }).withMessage('Detalhes devem ter no máximo 1000 caracteres.'),
  validate
], asyncHandler(controller.criar));

module.exports = router;
