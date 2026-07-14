const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../constants/domain');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório.'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres.']
  },
  email: {
    type: String,
    required: [true, 'E-mail é obrigatório.'],
    unique: true,
    lowercase: true,
    trim: true,
    select: false,
    match: [/^\S+@\S+\.\S+$/, 'Formato de e-mail inválido.']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória.'],
    minlength: [8, 'Senha deve ter no mínimo 8 caracteres.'],
    select: false
  },
  avatar: { type: String, default: '', maxlength: 500 },
  bio: { type: String, default: '', maxlength: 500 },
  papel: { type: String, enum: USER_ROLES, default: 'usuario', index: true },
  excluidoEm: { type: Date, default: null, index: true }
}, { timestamps: true });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('senha')) {
    this.senha = await bcrypt.hash(this.senha, 12);
  }
});

userSchema.methods.compararSenha = function compararSenha(value) {
  return bcrypt.compare(value, this.senha);
};

userSchema.methods.toJSON = function safeJson() {
  const object = this.toObject();
  delete object.email;
  delete object.senha;
  delete object.__v;
  return object;
};

module.exports = mongoose.model('User', userSchema);
