import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
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

  it('carrega o mapa de conferência somente quando a seção é aberta', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    const resumo = screen.getByText('Conferir ou ajustar no mapa (opcional)');
    expect(screen.queryByText('Mapa opcional')).not.toBeInTheDocument();
    await user.click(resumo);
    expect(await screen.findByText('Mapa opcional')).toBeInTheDocument();
    await user.click(resumo);
    await waitFor(() => expect(screen.getByText('Mapa opcional')).not.toBeVisible());
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

  it('pré-preenche somente endereço e coordenadas recebidos pela navegação', () => {
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/novo-local',
        state: {
          preenchimentoLocal: {
            endereco: 'Rua Pré-preenchida, 10',
            latitude: '-23.55',
            longitude: '-46.63',
            email: 'nao-transportar@example.test',
            token: 'nao-transportar'
          }
        }
      }]}>
        <NovoLocal />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Endereço ou referência')).toHaveValue('Rua Pré-preenchida, 10');
    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.55);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-46.63);
    expect(screen.getByRole('status')).toHaveTextContent('preenchidos a partir da busca');
    expect(buscarEndereco).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('nao-transportar@example.test')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('nao-transportar')).not.toBeInTheDocument();
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

  it('não converte latitude e longitude vazias em coordenadas zero', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    await user.type(screen.getByLabelText('Nome do local'), 'Local sintético');
    await user.type(screen.getByLabelText('Endereço ou referência'), 'Rua de Teste, 1');
    await user.type(screen.getByLabelText('Descrição'), 'Descrição suficientemente detalhada.');

    await user.click(screen.getByRole('button', { name: 'Enviar para moderação' }));

    expect(screen.getByLabelText('Latitude')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Longitude')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe uma latitude entre -90 e 90.')).toBeInTheDocument();
    expect(screen.getByText('Informe uma longitude entre -180 e 180.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveFocus());
    expect(criarLocal).not.toHaveBeenCalled();
  });

  it('permite coordenadas manuais quando geolocalização não existe', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    render(<MemoryRouter><NovoLocal /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(screen.getByRole('status')).toHaveTextContent(/não oferece geolocalização/);
  });
});
