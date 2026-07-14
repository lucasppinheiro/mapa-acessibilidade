const { searchAddress } = require('../services/geocodingService');

exports.buscar = async (req, res) => {
  const result = await searchAddress(req.query.q);
  res.setHeader('X-Cache', result.cache ? 'HIT' : 'MISS');
  res.json({
    resultados: result.resultados,
    cache: result.cache,
    atribuicao: '© OpenStreetMap contributors'
  });
};
