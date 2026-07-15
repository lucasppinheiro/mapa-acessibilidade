import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapaSobDemanda from './MapaSobDemanda';

const mapaMock = vi.hoisted(() => ({ falhar: false }));

vi.mock('./MapaInterativo', () => ({
  default: ({ titulo }) => {
    if (mapaMock.falhar) throw new Error('chunk indisponível');
    return <div aria-label={titulo}>Mapa carregado</div>;
  }
}));

describe('MapaSobDemanda', () => {
  beforeEach(() => { mapaMock.falhar = false; });

  it('não carrega o mapa antes da intenção da pessoa usuária', () => {
    const { rerender } = render(<MapaSobDemanda ativo={false} titulo="Mapa dos locais" />);
    expect(screen.queryByLabelText('Mapa dos locais')).not.toBeInTheDocument();

    rerender(<MapaSobDemanda ativo titulo="Mapa dos locais" />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando mapa');
  });

  it('apresenta o mapa depois do carregamento assíncrono', async () => {
    render(<MapaSobDemanda ativo titulo="Mapa dos locais" />);
    expect(await screen.findByLabelText('Mapa dos locais')).toHaveTextContent('Mapa carregado');
  });

  it('preserva o contexto após o primeiro carregamento e apenas o oculta', async () => {
    const { rerender } = render(<MapaSobDemanda ativo titulo="Mapa dos locais" />);
    const mapa = await screen.findByLabelText('Mapa dos locais');
    rerender(<MapaSobDemanda ativo={false} titulo="Mapa dos locais" />);
    await waitFor(() => expect(mapa).not.toBeVisible());
    expect(mapa).toBeInTheDocument();
  });

  it('isola falhas do mapa sem derrubar o restante da página', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mapaMock.falhar = true;
    render(<><p>Lista textual preservada</p><MapaSobDemanda ativo titulo="Mapa dos locais" /></>);
    expect(await screen.findByRole('alert')).toHaveTextContent('O mapa não pôde ser carregado');
    expect(screen.getByText('Lista textual preservada')).toBeInTheDocument();
  });
});
