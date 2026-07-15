import { describe, expect, it } from 'vitest';
import {
  estadoRetornoSeguro,
  normalizarPreenchimentoLocal,
  normalizarResultadosGeocodificacao,
  preenchimentoDeResultadoGeocodificacao
} from './navigation';

describe('estado de navegação seguro', () => {
  it('mantém somente endereço e coordenadas válidas no pré-preenchimento', () => {
    expect(normalizarPreenchimentoLocal({
      endereco: '  Rua Fictícia, 10  ',
      latitude: '-23.5',
      longitude: -46.6,
      nome: 'Não transportar',
      email: 'nao-transportar@example.test',
      token: 'segredo'
    })).toEqual({ endereco: 'Rua Fictícia, 10', latitude: '-23.5', longitude: '-46.6' });
  });

  it('rejeita coordenadas vazias ou fora do intervalo', () => {
    expect(normalizarPreenchimentoLocal({ endereco: 'Rua A', latitude: '', longitude: '' })).toBeNull();
    expect(normalizarPreenchimentoLocal({ endereco: 'Rua A', latitude: 91, longitude: 0 })).toBeNull();
  });

  it('aceita somente destinos internos previstos e remove dados extras', () => {
    expect(estadoRetornoSeguro({
      destino: '/novo-local',
      preenchimentoLocal: { endereco: 'Rua A', latitude: -23, longitude: -46, email: 'remover@example.test' },
      accessToken: 'remover'
    })).toEqual({
      destino: '/novo-local',
      preenchimentoLocal: { endereco: 'Rua A', latitude: '-23', longitude: '-46' }
    });
    expect(estadoRetornoSeguro({ destino: '/local/abc-123' })).toEqual({ destino: '/local/abc-123' });
    expect(estadoRetornoSeguro({ destino: 'https://example.test/coleta' })).toEqual({ destino: '/' });
  });

  it('normaliza o envelope e um resultado GeoJSON', () => {
    const resultado = { id: '1', endereco: 'Praça Teste', localizacao: { coordinates: [-46.7, -23.6] } };
    expect(normalizarResultadosGeocodificacao({ resultados: [resultado] })).toEqual([resultado]);
    expect(preenchimentoDeResultadoGeocodificacao(resultado)).toEqual({
      endereco: 'Praça Teste',
      latitude: '-23.6',
      longitude: '-46.7'
    });
  });
});
