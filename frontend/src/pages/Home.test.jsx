import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import { listarLocais } from '../services/api';

vi.mock('../components/MapaInterativo', () => ({ default: () => <div aria-label="Mapa dos locais">Mapa complementar</div> }));
vi.mock('../services/api', () => ({
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

describe('Home', () => {
  beforeEach(() => vi.clearAllMocks());
  it('mantém a lista textual e deixa o mapa opcional', async () => {
    listarLocais.mockResolvedValue({ data: { locais: [local], paginacao: { pagina: 1, totalPaginas: 1, total: 1, temProximaPagina: false } } });
    const { container } = render(<MemoryRouter><Home /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Biblioteca central' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lista/ })).toHaveAttribute('aria-pressed', 'true');
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
    await user.click(screen.getByRole('button', { name: /Lista/ }));
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
