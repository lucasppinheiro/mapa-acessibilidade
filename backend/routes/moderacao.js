const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/moderacaoController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const writeMode = require('../middleware/writeMode');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth, authorize('moderador', 'admin'));

router.get('/', [
  query('tipo').optional().isIn(['local', 'avaliacao', 'denuncia']).withMessage('Tipo inválido.'),
  validate
], asyncHandler(controller.fila));
router.get('/historico', asyncHandler(controller.historico));
router.post('/:tipo/:id/aprovar', writeMode, [
  param('tipo').isIn(['local', 'avaliacao', 'denuncia']).withMessage('Tipo inválido.'),
  param('id').isMongoId().withMessage('ID inválido.'),
  validate
], asyncHandler(controller.aprovar));
router.post('/:tipo/:id/rejeitar', writeMode, [
  param('tipo').isIn(['local', 'avaliacao', 'denuncia']).withMessage('Tipo inválido.'),
  param('id').isMongoId().withMessage('ID inválido.'),
  body('motivo').trim().isLength({ min: 5, max: 500 }).withMessage('Informe um motivo entre 5 e 500 caracteres.'),
  validate
], asyncHandler(controller.rejeitar));

module.exports = router;
