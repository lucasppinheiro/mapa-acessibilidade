const { criarPadraoBuscaToleranteAcentos } = require('../utils/buscaTexto');

describe('criarPadraoBuscaToleranteAcentos', () => {
  test.each([
    ['Praca', 'Praça'],
    ['Praça', 'Praca'],
    ['SAO JOAO', 'São João'],
    ['endereco', 'endereço']
  ])('faz %s corresponder a %s', (consulta, texto) => {
    const regex = new RegExp(criarPadraoBuscaToleranteAcentos(consulta), 'i');
    expect(regex.test(texto)).toBe(true);
  });

  test('trata metacaracteres como texto literal', () => {
    const regex = new RegExp(criarPadraoBuscaToleranteAcentos('.*(teste)[0-9]'), 'i');
    expect(regex.test('qualquer teste 123')).toBe(false);
    expect(regex.test('literal .*(teste)[0-9]')).toBe(true);
  });

  test('não transforma uma consulta só com marca combinante em padrão vazio', () => {
    const padrao = criarPadraoBuscaToleranteAcentos('\u0301');
    expect(padrao).not.toBe('');
    expect(new RegExp(padrao).test('texto sem marca combinante')).toBe(false);
  });
});
