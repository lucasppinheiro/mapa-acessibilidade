import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Moderacao from './Moderacao';
import { aprovarConteudo, listarFilaModeracao, listarHistoricoModeracao, rejeitarConteudo } from '../services/api';

vi.mock('../services/api', () => ({
  aprovarConteudo: vi.fn(),
  rejeitarConteudo: vi.fn(),
  listarFilaModeracao: vi.fn(),
  listarHistoricoModeracao: vi.fn(),
  extrairMensagemErro: (_error, fallback) => fallback
}));

const local = { tipo: 'local', id: 'l1', submetidoEm: '2026-01-01', conteudo: { nome: 'Local', endereco: 'Rua 1', descricao: 'Descrição' } };
const denuncia = { tipo: 'denuncia', id: 'd1', submetidoEm: '2026-01-02', conteudo: { motivo: 'duplicado', alvoTipo: 'local', alvoId: 'l1', detalhes: 'Duplicado' } };

describe('Moderacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarFilaModeracao.mockResolvedValue({ data: { itens: [local, denuncia] } });
    listarHistoricoModeracao.mockResolvedValue({ data: { eventos: [{ id: 'e1', acao: 'local.criado', entidadeTipo: 'local', entidadeId: 'l1', criadoEm: '2026-01-01' }] } });
    aprovarConteudo.mockResolvedValue({});
    rejeitarConteudo.mockResolvedValue({});
  });

  it('carrega fila e aprova conteúdo', async () => {
    const user = userEvent.setup();
    render(<Moderacao />);
    expect(await screen.findByText('Local: Local')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(aprovarConteudo).toHaveBeenCalledWith('local', 'l1');
    await waitFor(() => expect(listarHistoricoModeracao).toHaveBeenCalledTimes(2));
  });

  it('exige motivo e arquiva denúncia', async () => {
    const user = userEvent.setup();
    render(<Moderacao />);
    await screen.findByText('Denúncia: duplicado');
    await user.click(screen.getByRole('button', { name: 'Arquivar denúncia' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/pelo menos 5/);
    await user.type(screen.getAllByLabelText('Motivo da rejeição')[1], 'Sem fundamento');
    await user.click(screen.getByRole('button', { name: 'Arquivar denúncia' }));
    expect(rejeitarConteudo).toHaveBeenCalledWith('denuncia', 'd1', 'Sem fundamento');
  });

  it('filtra e anuncia erro de carregamento', async () => {
    const user = userEvent.setup();
    render(<Moderacao />);
    await screen.findByText('Local: Local');
    await user.selectOptions(screen.getByLabelText('Filtrar por tipo'), 'avaliacao');
    await waitFor(() => expect(listarFilaModeracao).toHaveBeenLastCalledWith({ tipo: 'avaliacao' }));
  });
});
