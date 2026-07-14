const { randomBytes } = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { usuarioPrivadoDTO } = require('../utils/dtos');
const {
  COOKIE_NAME,
  hashValue,
  createSession,
  rotateSession,
  revokeAllForUser,
  setRefreshCookie,
  clearRefreshCookie
} = require('../services/sessionService');
const { recordAudit } = require('../services/auditService');
const { withTransaction } = require('../services/transactionService');

const issueSession = async (usuario, req, res) => {
  const session = await createSession(usuario, req);
  setRefreshCookie(res, session.refreshToken);
  return session.accessToken;
};

exports.registro = async (req, res) => {
  const data = pick(req.body, ['nome', 'email', 'senha', 'bio']);
  const existing = await User.findOne({ email: data.email }).select('+email');
  if (existing) {
    throw new AppError(409, 'EMAIL_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
  }
  const usuario = await User.create(data);
  const withEmail = await User.findById(usuario._id).select('+email');
  const accessToken = await issueSession(withEmail, req, res);
  res.status(201).json({ usuario: usuarioPrivadoDTO(withEmail), accessToken });
};

exports.login = async (req, res) => {
  const data = pick(req.body, ['email', 'senha']);
  const usuario = await User.findOne({ email: data.email, excluidoEm: null }).select('+email +senha');
  if (!usuario || !(await usuario.compararSenha(data.senha))) {
    throw new AppError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
  }
  const accessToken = await issueSession(usuario, req, res);
  res.json({ usuario: usuarioPrivadoDTO(usuario), accessToken });
};

exports.refresh = async (req, res) => {
  const rotated = await rotateSession(req.cookies[COOKIE_NAME], req);
  setRefreshCookie(res, rotated.refreshToken);
  const usuario = await User.findById(rotated.usuario._id).select('+email');
  res.json({ usuario: usuarioPrivadoDTO(usuario), accessToken: rotated.accessToken });
};

exports.logout = async (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    await Session.updateOne(
      { tokenHash: hashValue(token), revogadoEm: null },
      { $set: { revogadoEm: new Date(), motivoRevogacao: 'logout' } }
    );
  }
  clearRefreshCookie(res);
  res.status(204).send();
};

exports.logoutTodas = async (req, res) => {
  await revokeAllForUser(req.usuario._id, 'logout_todas');
  clearRefreshCookie(res);
  res.status(204).send();
};

exports.perfil = async (req, res) => {
  const usuario = await User.findById(req.usuario._id).select('+email');
  res.json({ usuario: usuarioPrivadoDTO(usuario) });
};

exports.atualizarPerfil = async (req, res) => {
  const data = pick(req.body, ['nome', 'bio', 'avatar']);
  const usuario = await User.findByIdAndUpdate(
    req.usuario._id,
    { $set: data },
    { new: true, runValidators: true }
  ).select('+email');
  res.json({ usuario: usuarioPrivadoDTO(usuario) });
};

exports.excluirConta = async (req, res) => {
  await withTransaction(async (session) => {
    const usuario = await User.findById(req.usuario._id).select('+email +senha').session(session);
    if (!usuario || usuario.excluidoEm) {
      throw new AppError(404, 'USUARIO_NAO_ENCONTRADO', 'Conta não encontrada.');
    }
    if (req.body.confirmacao !== 'EXCLUIR' || !(await usuario.compararSenha(req.body.senha))) {
      throw new AppError(400, 'CONFIRMACAO_INVALIDA', 'Senha ou confirmação de exclusão inválida.');
    }
    usuario.nome = 'Usuário removido';
    usuario.email = `conta-excluida-${usuario.id}@invalid.local`;
    usuario.senha = randomBytes(32).toString('hex');
    usuario.avatar = '';
    usuario.bio = '';
    usuario.excluidoEm = new Date();
    await usuario.save({ session });
    await revokeAllForUser(usuario._id, 'conta_excluida', session);
    await recordAudit({
      req,
      action: 'conta.anonimizada',
      entityType: 'usuario',
      entityId: usuario._id,
      before: { excluido: false },
      after: { excluido: true },
      session
    });
  });
  clearRefreshCookie(res);
  res.status(204).send();
};
