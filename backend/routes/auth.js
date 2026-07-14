const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const writeMode = require('../middleware/writeMode');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const emailRule = body('email').isEmail().withMessage('Informe um e-mail válido.').normalizeEmail();
const passwordRule = body('senha')
  .isLength({ min: 8, max: 128 }).withMessage('A senha deve ter entre 8 e 128 caracteres.')
  .matches(/[A-Z]/).withMessage('A senha deve conter uma letra maiúscula.')
  .matches(/[a-z]/).withMessage('A senha deve conter uma letra minúscula.')
  .matches(/[0-9]/).withMessage('A senha deve conter um número.');

router.post('/registro', writeMode, [
  body('nome').trim().isLength({ min: 2, max: 100 }).withMessage('Informe um nome entre 2 e 100 caracteres.'),
  emailRule,
  passwordRule,
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('A bio deve ter no máximo 500 caracteres.'),
  validate
], asyncHandler(controller.registro));

router.post('/login', [
  emailRule,
  body('senha').isString().notEmpty().withMessage('Informe a senha.'),
  validate
], asyncHandler(controller.login));
router.post('/refresh', asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));
router.post('/logout-todas', auth, asyncHandler(controller.logoutTodas));
router.get('/perfil', auth, asyncHandler(controller.perfil));
router.patch('/perfil', auth, [
  body('nome').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nome inválido.'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio inválida.'),
  body('avatar').optional().isURL({ protocols: ['https'], require_protocol: true }).withMessage('Avatar deve usar uma URL HTTPS.'),
  validate
], asyncHandler(controller.atualizarPerfil));
router.delete('/perfil', auth, [
  body('senha').isString().notEmpty().withMessage('Informe sua senha atual.'),
  body('confirmacao').equals('EXCLUIR').withMessage('Digite EXCLUIR para confirmar.'),
  validate
], asyncHandler(controller.excluirConta));

module.exports = router;
