import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mapMocks = vi.hoisted(() => ({ setView: vi.fn(), invalidateSize: vi.fn(), events: null, divIcon: vi.fn((value) => value) }));

vi.mock('leaflet', () => {
  class DefaultIcon {}
  DefaultIcon.mergeOptions = vi.fn();
  return { default: { Icon: { Default: DefaultIcon }, divIcon: mapMocks.divIcon } };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mapa">{children}</div>,
  Marker: ({ children, title, alt, eventHandlers }) => {
    const elemento = document.createElement('button');
    eventHandlers?.add?.({ target: { getElement: () => elemento } });
    return <div><button type="button" aria-label={alt || title}>{title}</button>{children}</div>;
  },
  Popup: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({ setView: mapMocks.setView, invalidateSize: mapMocks.invalidateSize }),
  useMapEvents: (events) => { mapMocks.events = events; return {}; }
}));

import MapaInterativo from './MapaInterativo';

const local = { id: 'l1', nome: 'Biblioteca', endereco: 'Rua 1', descricao: 'Descrição', categoria: 'lazer', localizacao: { coordinates: [-46, -23] }, resumoAvaliacoes: { media: 4, total: 1 } };

describe('MapaInterativo', () => {
  it('é complementar, não usa role application e nomeia marcadores', () => {
    const { container } = render(<MemoryRouter><MapaInterativo locais={[local]} centroInicial={[-23, -46]} /></MemoryRouter>);
    expect(container.querySelector('[role="application"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Marcador do local Biblioteca' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalhes de Biblioteca' })).toBeInTheDocument();
    expect(mapMocks.setView).toHaveBeenCalledWith([-23, -46], 16);
    expect(mapMocks.invalidateSize).toHaveBeenCalledWith({ animate: false });
  });

  it('permite ajuste opcional sem tornar o mapa obrigatório', () => {
    const selecionar = vi.fn();
    render(<MemoryRouter><MapaInterativo locais={[]} marcadorSelecionado={{ lat: -22, lng: -43 }} onLocationSelect={selecionar} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Marcador das coordenadas selecionadas' })).toBeInTheDocument();
    mapMocks.events.click({ latlng: { lat: 1, lng: 2 } });
    expect(selecionar).toHaveBeenCalledWith({ lat: 1, lng: 2 });
  });

  it('representa ausência de nota sem inventar 3', () => {
    render(<MemoryRouter><MapaInterativo locais={[{ ...local, resumoAvaliacoes: { media: null } }]} /></MemoryRouter>);
    expect(mapMocks.divIcon).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('?') }));
  });
});
