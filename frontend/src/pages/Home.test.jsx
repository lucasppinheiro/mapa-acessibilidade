import { axe } from 'jest-axe';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import { buscarEndereco, listarLocais } from '../services/api';

vi.mock('../components/MapaInterativo', () => ({ default: () => <div aria-label="Mapa dos locais">Mapa complementar</div> }));
vi.mock('../services/api', () => ({
  buscarEndereco: vi.fn(),
  listarLocais: vi.fn(),
  extrairMensagemErro: (_error, fallback) => fallback
}));

const local = {
  id: 'local-1',
  nome: 'Biblioteca central',
  endereco: 'Praça Sintética, 10',
  descricao: 'Local fictício para testes.',
  categoria: 'servico_publico',
  recursos: { rampa: 'presente' },
  resumoAvaliacoes: { media: null, total: 0 },
  localizacao: { type: 'Point', coordinates: [-46.6, -23.5] }
};

function EstadoNavegacao() {
  const location = useLocation();
  return <output data-testid="estado-navegacao">{JSON.stringify(location.state)}</output>;
}

describe('Home', () => {
  beforeEach(() => vi.clearAllMocks());
  it('mantém a lista textual e deixa o mapa opcional', async () => {
    listarLocais.mockResolvedValue({ data: { locais: [local], paginacao: { pagina: 1, totalPaginas: 1, total: 1, temProximaPagina: false } } });
    const { container } = render(<MemoryRouter><Home /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Biblioteca central' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lista/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Mapa dos locais')).not.toBeInTheDocument();
    expect(screen.getByText('Ainda não avaliado')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('busca somente após envio explícito', async () => {
    const user = userEvent.setup();
    listarLocais.mockResolvedValue({ data: { locais: [], paginacao: { pagina: 1, totalPaginas: 1, total: 0 } } });
    render(<MemoryRouter><Home /></MemoryRouter>);
    await waitFor(() => expect(listarLocais).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText('Buscar por nome ou endereço'), 'Praça');
    expect(listarLocais).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(listarLocais).toHaveBeenCalledTimes(2));
  });

  it('busca endereço somente por ação explícita e encaminha pré-preenchimento seguro', async () => {
    const user = userEvent.setup();
    listarLocais.mockResolvedValue({ data: { locais: [], paginacao: { pagina: 1, totalPaginas: 1, total: 0 } } });
    buscarEndereco.mockResolvedValue({
      data: {
        resultados: [{ id: 'geo-1', endereco: 'Praça Fictícia, São Paulo', localizacao: { coordinates: [-46.7, -23.6] } }],
        atribuicao: '© OpenStreetMap contributors'
      }
    });
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/novo-local" element={<EstadoNavegacao />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(listarLocais).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText('Buscar por nome ou endereço'), 'Praça Fictícia');
    expect(buscarEndereco).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(listarLocais).toHaveBeenCalledTimes(2));
    expect(buscarEndereco).not.toHaveBeenCalled();

    const botaoEndereco = await screen.findByRole('button', { name: /Buscar “Praça Fictícia” como endereço/ });
    botaoEndereco.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(buscarEndereco).toHaveBeenCalledWith('Praça Fictícia'));
    expect(await screen.findByRole('heading', { name: 'Endereços encontrados — sem dados de acessibilidade' })).toBeInTheDocument();
    expect(screen.getByText('Endereço sem informações de acessibilidade cadastradas.')).toBeInTheDocument();
    expect(screen.getByText(/1 endereço encontrado\./)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('link', { name: 'Cadastrar acessibilidade deste endereço' }));
    expect(screen.getByTestId('estado-navegacao')).toHaveTextContent(JSON.stringify({
      preenchimentoLocal: { endereco: 'Praça Fictícia, São Paulo', latitude: '-23.6', longitude: '-46.7' }
    }));
  });

  it('orienta o cadastro manual quando a busca geográfica não encontra endereço', async () => {
    const user = userEvent.setup();
    listarLocais.mockResolvedValue({ data: { locais: [], paginacao: { pagina: 1, totalPaginas: 1, total: 0 } } });
    buscarEndereco.mockResolvedValue({ data: { resultados: [], atribuicao: '© OpenStreetMap contributors' } });
    render(<MemoryRouter><Home /></MemoryRouter>);

    await waitFor(() => expect(listarLocais).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText('Buscar por nome ou endereço'), 'Endereço inexistente');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(await screen.findByRole('button', { name: /Buscar “Endereço inexistente” como endereço/ }));

    expect(await screen.findByRole('heading', { name: 'Nenhum endereço geográfico encontrado' })).toBeInTheDocument();
    expect(await screen.findByText('Nenhum endereço encontrado. Tente outro termo ou faça o cadastro manual.')).toBeInTheDocument();
    expect(screen.queryByText(/0 endereços encontrados/)).not.toBeInTheDocument();
  });

  it('abre, aplica e limpa filtros, além de alternar a visualização', async () => {
    const user = userEvent.setup();
    listarLocais.mockResolvedValue({ data: { locais: [local], paginacao: { pagina: 1, totalPaginas: 1, total: 1 } } });
    render(<MemoryRouter><Home /></MemoryRouter>);
    await screen.findByRole('link', { name: 'Biblioteca central' });
    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    await user.selectOptions(screen.getByLabelText('Categoria'), 'lazer');
    await user.selectOptions(screen.getByLabelText('Recurso presente'), 'rampa');
    await user.selectOptions(screen.getByLabelText('Média mínima'), '4');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByLabelText('Categoria')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /Mapa/ }));
    expect(screen.getByRole('button', { name: /Mapa/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByLabelText('Mapa dos locais')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Lista/ }));
    await waitFor(() => expect(screen.getByLabelText('Mapa dos locais')).not.toBeVisible());
    expect(screen.getByRole('link', { name: 'Biblioteca central' })).toBeVisible();
  });

  it('oferece retry em erro e pagina os resultados', async () => {
    const user = userEvent.setup();
    listarLocais
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce({ data: { locais: [local], paginacao: { pagina: 1, totalPaginas: 2, total: 21, temProximaPagina: true } } })
      .mockResolvedValueOnce({ data: { locais: [{ ...local, id: 'local-2', nome: 'Página dois' }], paginacao: { pagina: 2, totalPaginas: 2, total: 21, temProximaPagina: false } } });
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('button', { name: 'Próxima página' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(await screen.findByRole('link', { name: 'Página dois' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
  });
});
