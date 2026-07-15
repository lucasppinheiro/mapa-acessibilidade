import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DetalhesLocal from './DetalhesLocal';
import { arquivarAvaliacao, arquivarLocal, criarAvaliacao, listarAvaliacoes, obterLocal } from '../services/api';

const auth = { autenticado: true, usuario: { id: 'u1', nome: 'Ana' }, podeModerar: false };
vi.mock('../context/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../components/MapaInterativo', () => ({ default: () => <div>Mapa complementar</div> }));
vi.mock('../components/DenunciaForm', () => ({ default: ({ alvoTipo, alvoId }) => <div>Denúncia {alvoTipo} {alvoId}</div> }));
vi.mock('../services/api', () => ({
  obterLocal: vi.fn(),
  listarAvaliacoes: vi.fn(),
  criarAvaliacao: vi.fn(),
  arquivarLocal: vi.fn(),
  arquivarAvaliacao: vi.fn(),
  extrairMensagemErro: (_error, fallback) => fallback
}));

const recursos = { rampa: 'presente', elevador: 'ausente' };
const local = {
  id: 'l1', nome: 'Centro cultural', endereco: 'Rua Sintética, 1', descricao: 'Descrição acessível e fictícia.', categoria: 'lazer',
  autor: { id: 'u1', nome: 'Ana' }, criadoEm: '2026-01-01', localizacao: { coordinates: [-46, -23] }, recursos,
  resumoAvaliacoes: { media: 4, total: 1 },
  resumoRecursos: { rampa: { informado: 'presente', confirmacoes: 2, contestacoes: 1, ultimaVerificacao: '2026-01-02' } }
};
const avaliacao = { id: 'a1', nota: 4, comentario: 'Experiência detalhada e fictícia.', autor: { id: 'u1', nome: 'Ana' }, criadoEm: '2026-01-02', observacoesRecursos: recursos };

function EstadoLogin() {
  const location = useLocation();
  return <output data-testid="estado-login">{JSON.stringify(location.state)}</output>;
}

const renderPagina = () => render(<MemoryRouter initialEntries={['/local/l1']}><Routes><Route path="/local/:id" element={<DetalhesLocal />} /><Route path="/login" element={<EstadoLogin />} /><Route path="/" element={<p>Início</p>} /></Routes></MemoryRouter>);

describe('DetalhesLocal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.autenticado = true;
    auth.usuario = { id: 'u1', nome: 'Ana' };
    auth.podeModerar = false;
    obterLocal.mockResolvedValue({ data: { local } });
    listarAvaliacoes.mockResolvedValue({ data: { avaliacoes: [avaliacao], paginacao: { pagina: 1, totalPaginas: 1, temProximaPagina: false } } });
    criarAvaliacao.mockResolvedValue({});
    arquivarLocal.mockResolvedValue({});
    arquivarAvaliacao.mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('mostra origem, confirmações, contestações e avaliações aprovadas', async () => {
    renderPagina();
    expect(await screen.findByRole('heading', { name: 'Centro cultural' })).toBeInTheDocument();
    expect(screen.getByText(/2 confirmações; 1 contestações/)).toBeInTheDocument();
    expect(screen.getByText('Experiência detalhada e fictícia.')).toBeInTheDocument();
    expect(screen.getByText('Denúncia local l1')).toBeInTheDocument();
  });

  it('carrega o mapa do detalhe somente quando solicitado', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByRole('heading', { name: 'Centro cultural' });
    const resumo = screen.getByText('Ver no mapa (opcional)');
    expect(screen.queryByText('Mapa complementar')).not.toBeInTheDocument();
    await user.click(resumo);
    expect(await screen.findByText('Mapa complementar')).toBeInTheDocument();
    await user.click(resumo);
    await waitFor(() => expect(screen.getByText('Mapa complementar')).not.toBeVisible());
  });

  it('valida e envia avaliação tri-state para moderação', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByRole('heading', { name: 'Centro cultural' });
    await user.click(screen.getByRole('button', { name: 'Enviar para moderação' }));
    expect(screen.getByText('Selecione uma nota de 1 a 5.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '5 estrelas' }));
    await user.type(screen.getByLabelText('Comentário'), 'Avaliação nova e detalhada.');
    await user.click(screen.getAllByRole('radio', { name: 'Presente' })[0]);
    await user.click(screen.getByRole('button', { name: 'Enviar para moderação' }));
    expect(criarAvaliacao).toHaveBeenCalledWith('l1', expect.objectContaining({ nota: 5, comentario: 'Avaliação nova e detalhada.', observacoesRecursos: expect.objectContaining({ rampa: 'presente' }) }));
  });

  it('pagina e arquiva somente com confirmação', async () => {
    const user = userEvent.setup();
    listarAvaliacoes
      .mockResolvedValueOnce({ data: { avaliacoes: [avaliacao], paginacao: { pagina: 1, totalPaginas: 2, temProximaPagina: true } } })
      .mockResolvedValueOnce({ data: { avaliacoes: [{ ...avaliacao, id: 'a2', autor: { id: 'u2', nome: 'Bia' } }], paginacao: { pagina: 2, totalPaginas: 2, temProximaPagina: false } } });
    renderPagina();
    await user.click(await screen.findByRole('button', { name: 'Carregar mais avaliações' }));
    await waitFor(() => expect(listarAvaliacoes).toHaveBeenLastCalledWith('l1', { pagina: 2, limite: 10 }));
    await user.click(screen.getByRole('button', { name: 'Arquivar avaliação' }));
    expect(arquivarAvaliacao).toHaveBeenCalledWith('l1', 'a1');
    await user.click(screen.getByRole('button', { name: 'Arquivar local' }));
    expect(arquivarLocal).toHaveBeenCalledWith('l1');
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('oferece login quando visitante e trata local ausente', async () => {
    const user = userEvent.setup();
    auth.autenticado = false;
    auth.usuario = null;
    renderPagina();
    await user.click(await screen.findByRole('link', { name: /Entre na sua conta/ }));
    expect(screen.getByTestId('estado-login')).toHaveTextContent(JSON.stringify({ destino: '/local/l1' }));
  });

  it('mostra erro estruturado ao falhar o carregamento', async () => {
    obterLocal.mockRejectedValue(new Error('falhou'));
    renderPagina();
    expect(await screen.findByRole('heading', { name: 'Local indisponível' })).toBeInTheDocument();
  });
});
