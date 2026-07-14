class AppError extends Error {
  constructor(statusCode, codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

module.exports = AppError;
