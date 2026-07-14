require('dotenv').config();
const mongoose = require('mongoose');
const { getConfig, validateRuntimeConfig } = require('../config/env');
const { RESOURCE_KEYS, RESOURCE_STATES } = require('../constants/domain');
const { recalcularMedia } = require('../utils/calcularMedia');

const statusMap = {
  ativo: 'aprovado',
  pendente: 'pendente',
  inativo: 'arquivado',
  aprovado: 'aprovado',
  rejeitado: 'rejeitado',
  arquivado: 'arquivado'
};

const migrateResources = (resources = {}) => RESOURCE_KEYS.reduce((result, key) => {
  const current = resources[key];
  result[key] = RESOURCE_STATES.includes(current)
    ? current
    : current === true ? 'presente' : 'desconhecido';
  return result;
}, {});

const migrate = async () => {
  if (process.env.MIGRATION_DATA_CONFIRMED_SYNTHETIC !== 'true') {
    throw new Error(
      'Migração interrompida: valide que a base não contém dados reais e defina MIGRATION_DATA_CONFIRMED_SYNTHETIC=true.'
    );
  }
  const config = getConfig();
  validateRuntimeConfig(config);
  await mongoose.connect(config.mongodbUri);
  const db = mongoose.connection.db;

  const userResult = await db.collection('users').updateMany({}, {
    $unset: { tipoDeficiencia: '', tokenVersion: '' }
  });
  await db.collection('users').updateMany(
    { papel: { $nin: ['usuario', 'moderador', 'admin'] } },
    { $set: { papel: 'usuario' } }
  );

  let migratedLocations = 0;
  for await (const local of db.collection('locals').find({})) {
    const coordinates = local.localizacao?.type === 'Point'
      ? local.localizacao.coordinates
      : [Number(local.coordenadas?.lng), Number(local.coordenadas?.lat)];
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || coordinates.some((value) => !Number.isFinite(value))) {
      throw new Error(`Local ${local._id} sem coordenadas válidas; migração interrompida.`);
    }
    await db.collection('locals').updateOne({ _id: local._id }, {
      $set: {
        localizacao: { type: 'Point', coordinates },
        recursos: migrateResources(local.recursos),
        status: statusMap[local.status] || 'pendente',
        arquivadoEm: (statusMap[local.status] || 'pendente') === 'arquivado'
          ? (local.arquivadoEm || new Date())
          : (local.arquivadoEm || null)
      },
      $unset: { coordenadas: '', notaAcessibilidade: '' }
    });
    migratedLocations += 1;
  }

  let migratedReviews = 0;
  for await (const review of db.collection('avaliacaos').find({})) {
    await db.collection('avaliacaos').updateOne({ _id: review._id }, {
      $set: {
        observacoesRecursos: migrateResources(review.observacoesRecursos || review.recursosConfirmados),
        status: statusMap[review.status] || 'aprovado'
      },
      $unset: { recursosConfirmados: '', tipoDeficiencia: '' }
    });
    migratedReviews += 1;
  }

  const ids = await db.collection('locals').distinct('_id');
  for (const id of ids) await recalcularMedia(id);

  console.info(JSON.stringify({
    evento: 'migration_v1_completed',
    usuariosProcessados: userResult.matchedCount,
    locaisProcessados: migratedLocations,
    avaliacoesProcessadas: migratedReviews
  }));
};

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
