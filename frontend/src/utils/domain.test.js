import { describe, expect, it } from 'vitest';
import { coordenadasDe, dataFormatada, estadoRecursoDe, idDe, mediaDe, totalAvaliacoesDe } from './domain';

describe('adaptadores de domínio', () => {
  it('lê DTOs públicos com GeoJSON e resumo', () => {
    const local = { id: '1', localizacao: { coordinates: [-46.6, -23.5] }, resumoAvaliacoes: { media: 4.5, total: 2 } };
    expect(idDe(local)).toBe('1');
    expect(coordenadasDe(local)).toEqual({ lat: -23.5, lng: -46.6 });
    expect(mediaDe(local)).toBe(4.5);
    expect(totalAvaliacoesDe(local)).toBe(2);
  });

  it('normaliza formatos legados sem tratar false como ausente', () => {
    expect(coordenadasDe({ coordenadas: { lat: 1, lng: 2 } })).toEqual({ lat: 1, lng: 2 });
    expect(estadoRecursoDe(true)).toBe('presente');
    expect(estadoRecursoDe(false)).toBe('desconhecido');
    expect(mediaDe({ notaAcessibilidade: null })).toBeNull();
  });

  it('formata datas defensivamente', () => {
    expect(dataFormatada(null)).toBe('data não informada');
    expect(dataFormatada('inválida')).toBe('data não informada');
    expect(dataFormatada('2026-07-14T12:00:00Z')).toMatch(/14\/07\/2026/);
  });
});
