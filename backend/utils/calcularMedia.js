const mongoose = require('mongoose');
const Avaliacao = require('../models/Avaliacao');
const Local = require('../models/Local');

const recalcularMedia = async (localId, session) => {
  const aggregation = Avaliacao.aggregate([
    { $match: { local: new mongoose.Types.ObjectId(String(localId)), status: 'aprovado' } },
    {
      $group: {
        _id: '$local',
        media: { $avg: '$nota' },
        total: { $sum: 1 },
        ultimaVerificacao: { $max: '$createdAt' }
      }
    }
  ]);
  if (session) aggregation.session(session);
  const [summary] = await aggregation;
  await Local.updateOne(
    { _id: localId },
    {
      $set: {
        mediaAvaliacao: summary ? Math.round(summary.media * 10) / 10 : null,
        totalAvaliacoesAprovadas: summary?.total || 0,
        ultimaVerificacao: summary?.ultimaVerificacao || null
      }
    },
    session ? { session } : undefined
  );
};

module.exports = { recalcularMedia };
