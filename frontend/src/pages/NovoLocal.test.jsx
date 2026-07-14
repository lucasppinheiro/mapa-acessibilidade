import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NovoLocal from './NovoLocal';
import { buscarEndereco, criarLocal } from '../services/api';

vi.mock('../components/MapaInterativo', () => ({ default: () => <div>Mapa opcional</div> }));
vi.mock('../services/api', () => ({
  buscarEndereco: vi.fn(),
  criarLocal: vi.fn(),
  extrairMensagemErro: (_error, fallback) => fallback
}));

describe('NovoLocal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
  });

  it('não pede localização ao abrir e oferece alternativas manuais', async () => {
    const { container } = render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByText(/Conferir ou ajustar no mapa \(opcional\)/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('faz geocodificação apenas ao clicar e aceita GeoJSON', async () => {
    const user = userEvent.setup();
    buscarEndereco.mockResolvedValue({ data: { resultados: [{ id: 'r1', endereco: 'Rua Fictícia, 1', localizacao: { coordinates: [-46.7, -23.6] } }] } });
    render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    await user.type(screen.getByLabelText('Endereço para busca'), 'Rua Fictícia');
    expect(buscarEndereco).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Buscar endereço' }));
    await user.click(await screen.findByRole('radio', { name: 'Rua Fictícia, 1' }));
    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.6);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-46.7);
  });

  it('mantém a jornada ativa quando geolocalização é negada e aceita sucesso', async () => {
    const user = userEvent.setup();
    let sucesso;
    let falha;
    navigator.geolocation.getCurrentPosition.mockImplementation((ok, erro) => { sucesso = ok; falha = erro; });
    render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Usar minha localização' }));
    await act(async () => falha());
    expect(await screen.findByText(/Localização não compartilhada/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar minha localização' }));
    await act(async () => sucesso({ coords: { latitude: -23.5, longitude: -46.6 } }));
    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.5);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-46.6);
  });

  it('valida campos, trata busca vazia/erro e envia DTO GeoJSON', async () => {
    const user = userEvent.setup();
    buscarEndereco.mockRejectedValue(new Error('indisponível'));
    criarLocal.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/novo-local']}><NovoLocal /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Enviar para moderação' }));
    expect(screen.getByText('Informe o nome do local.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Endereço para busca'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Buscar endereço' }));
    expect(screen.getByRole('status')).toHaveTextContent('pelo menos 3');
    await user.type(screen.getByLabelText('Endereço para busca'), 'c');
    await user.click(screen.getByRole('button', { name: 'Buscar endereço' }));
    expect(await screen.findByRole('status')).toHaveTextContent('não está disponível');
    await user.type(screen.getByLabelText('Nome do local'), 'Local sintético');
    await user.type(screen.getByLabelText('Endereço ou referência'), 'Rua de Teste, 1');
    await user.type(screen.getByLabelText('Descrição'), 'Descrição suficientemente detalhada.');
    await user.type(screen.getByLabelText('Latitude'), '-23.5');
    await user.type(screen.getByLabelText('Longitude'), '-46.6');
    await user.click(screen.getAllByRole('radio', { name: 'Presente' })[0]);
    await user.click(screen.getByRole('button', { name: 'Enviar para moderação' }));
    expect(criarLocal).toHaveBeenCalledWith(expect.objectContaining({ localizacao: { type: 'Point', coordinates: [-46.6, -23.5] } }));
  });

  it('permite coordenadas manuais quando geolocalização não existe', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(screen.getByRole('status')).toHaveTextContent(/não oferece geolocalização/);
  });
});
