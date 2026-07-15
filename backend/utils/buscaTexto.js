const GRUPOS_DIACRITICOS = {
  a: 'aáàâãäåāăą',
  c: 'cçćĉċč',
  e: 'eéèêëēĕėęě',
  i: 'iíìîïĩīĭįı',
  n: 'nñńņň',
  o: 'oóòôõöøōŏő',
  u: 'uúùûüũūŭůűų',
  y: 'yýÿŷ'
};

const MARCAS_COMBINANTES = /[\u0300-\u036f]/g;
const CARACTERES_REGEX = /[.*+?^${}()|[\]\\]/g;

const escaparRegex = (valor) => valor.replace(CARACTERES_REGEX, '\\$&');

const criarPadraoBuscaToleranteAcentos = (valor) => {
  const original = Array.from(String(valor ?? '')).slice(0, 100).join('');
  const normalizado = original.normalize('NFD').replace(MARCAS_COMBINANTES, '');
  const caracteres = Array.from(normalizado || original);

  return caracteres.map((caractere) => {
    const grupo = GRUPOS_DIACRITICOS[caractere.toLocaleLowerCase('pt-BR')];
    // Apenas classes fixas ou caracteres escapados chegam ao mecanismo de regex.
    return grupo ? `[${grupo}]` : escaparRegex(caractere);
  }).join('');
};

module.exports = { criarPadraoBuscaToleranteAcentos };
