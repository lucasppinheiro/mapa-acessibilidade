require('dotenv').config();
const mongoose = require('mongoose');
const { getConfig, validateRuntimeConfig } = require('../config/env');
const User = require('../models/User');
const Local = require('../models/Local');
const Avaliacao = require('../models/Avaliacao');
const { recalcularMedia } = require('../utils/calcularMedia');

const users = [
  { key: 'ana', nome: 'Ana Demonstração', email: 'ana.demo@example.invalid', bio: 'Conta fictícia do dataset sintético.' },
  { key: 'bruno', nome: 'Bruno Demonstração', email: 'bruno.demo@example.invalid', bio: 'Conta fictícia do dataset sintético.' }
];

const locations = [
  {
    id: 'local-biblioteca-demo',
    autor: 'ana',
    nome: 'Biblioteca Horizonte — local fictício',
    descricao: 'Local totalmente fictício criado para demonstrar informações de acessibilidade.',
    endereco: 'Rua Exemplo, 100 — endereço fictício',
    categoria: 'servico_publico',
    localizacao: { type: 'Point', coordinates: [-46.6333, -23.5505] },
    recursos: { rampa: 'presente', elevador: 'ausente', banheiroAcessivel: 'presente', pisoTatil: 'desconhecido' }
  },
  {
    id: 'local-praca-demo',
    autor: 'bruno',
    nome: 'Praça Encontro — local fictício',
    descricao: 'Praça fictícia usada apenas no portfólio e sem vínculo com um endereço real.',
    endereco: 'Avenida Demonstração, 200 — endereço fictício',
    categoria: 'lazer',
    localizacao: { type: 'Point', coordinates: [-46.642, -23.557] },
    recursos: { rampa: 'presente', banheiroAcessivel: 'desconhecido', pisoTatil: 'ausente' }
  }
];

const main = async () => {
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Defina DEMO_SEED_PASSWORD com pelo menos 12 caracteres; o valor não deve ser versionado.');
  }
  const config = getConfig();
  validateRuntimeConfig(config);
  await mongoose.connect(config.mongodbUri);

  const userByKey = {};
  for (const data of users) {
    let user = await User.findOne({ email: data.email }).select('+email');
    if (!user) user = await User.create({ nome: data.nome, email: data.email, senha: password, bio: data.bio });
    userByKey[data.key] = user;
  }

  const localBySeedId = {};
  for (const data of locations) {
    const local = await Local.findOneAndUpdate(
      { origemSinteticaId: data.id },
      {
        $set: {
          nome: data.nome,
          descricao: data.descricao,
          endereco: data.endereco,
          categoria: data.categoria,
          localizacao: data.localizacao,
          recursos: data.recursos,
          autor: userByKey[data.autor]._id,
          status: 'aprovado',
          motivoRejeicao: null,
          arquivadoEm: null
        },
        $setOnInsert: { origemSinteticaId: data.id }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('+origemSinteticaId');
    localBySeedId[data.id] = local;
  }

  const reviewData = {
    origemSinteticaId: 'avaliacao-biblioteca-demo',
    local: localBySeedId['local-biblioteca-demo']._id,
    autor: userByKey.bruno._id,
    nota: 4,
    comentario: 'Avaliação fictícia: a entrada informada é acessível, mas o elevador foi observado como ausente.',
    observacoesRecursos: { rampa: 'presente', elevador: 'ausente', banheiroAcessivel: 'presente' },
    status: 'aprovado'
  };
  await Avaliacao.findOneAndUpdate(
    { origemSinteticaId: reviewData.origemSinteticaId },
    { $set: reviewData },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  for (const local of Object.values(localBySeedId)) await recalcularMedia(local._id);
  console.info(JSON.stringify({ evento: 'synthetic_seed_completed', usuarios: users.length, locais: locations.length, avaliacoes: 1 }));
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
