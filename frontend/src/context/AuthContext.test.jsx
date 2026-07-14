import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import * as servico from '../services/api';

vi.mock('../services/api', () => ({
  definirAccessToken: vi.fn(),
  limparAccessToken: vi.fn(),
  renovarSessao: vi.fn(),
  obterPerfil: vi.fn(),
  login: vi.fn(),
  registrar: vi.fn(),
  logoutAtual: vi.fn(),
  logoutTodas: vi.fn(),
  excluirConta: vi.fn(),
  extrairMensagemErro: (_error, fallback) => fallback
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <output>{auth.carregando ? 'carregando' : auth.autenticado ? `autenticado-${auth.usuario.nome}-${auth.podeModerar}` : 'anônimo'}</output>
      <button onClick={() => auth.login('ana@test.local', 'Senha123')}>login</button>
      <button onClick={() => auth.registrar({ nome: 'Ana', email: 'ana@test.local', senha: 'Senha123' })}>registro</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button onClick={() => auth.logoutTodas().catch(() => {})}>logout-todas</button>
      <button onClick={() => auth.excluirConta({ senha: 'Senha123', confirmacao: 'EXCLUIR' }).catch(() => {})}>excluir</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restaura sessão pelo cookie e identifica moderação', async () => {
    servico.renovarSessao.mockResolvedValue({ usuario: { id: '1', nome: 'Moderadora', papel: 'moderador' }, accessToken: 'a' });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('autenticado-Moderadora-true')).toBeInTheDocument();
  });

  it('consulta perfil quando refresh não inclui usuário', async () => {
    servico.renovarSessao.mockResolvedValue({ accessToken: 'a' });
    servico.obterPerfil.mockResolvedValue({ data: { usuario: { id: '1', nome: 'Ana', papel: 'usuario' } } });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('autenticado-Ana-false')).toBeInTheDocument();
  });

  it('mantém visitante anônimo se não houver cookie', async () => {
    servico.renovarSessao.mockRejectedValue(new Error('sem cookie'));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('anônimo')).toBeInTheDocument();
    expect(servico.limparAccessToken).toHaveBeenCalled();
  });

  it('executa login, registro, logout, logout global e exclusão', async () => {
    const user = userEvent.setup();
    servico.renovarSessao.mockRejectedValue(new Error('sem cookie'));
    servico.login.mockResolvedValue({ data: { accessToken: 'l', usuario: { id: '1', nome: 'Login', papel: 'usuario' } } });
    servico.registrar.mockResolvedValue({ data: { accessToken: 'r', usuario: { id: '2', nome: 'Registro', papel: 'usuario' } } });
    servico.logoutAtual.mockResolvedValue();
    servico.logoutTodas.mockResolvedValue();
    servico.excluirConta.mockResolvedValue();
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('anônimo');
    await user.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('autenticado-Login-false')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'registro' }));
    expect(await screen.findByText('autenticado-Registro-false')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(servico.logoutAtual).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'logout-todas' }));
    await user.click(screen.getByRole('button', { name: 'excluir' }));
    expect(servico.logoutTodas).toHaveBeenCalled();
    expect(servico.excluirConta).toHaveBeenCalledWith({ senha: 'Senha123', confirmacao: 'EXCLUIR' });
  });

  it('limpa sessão após evento de revogação', async () => {
    servico.renovarSessao.mockResolvedValue({ usuario: { nome: 'Ana', papel: 'usuario' } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('autenticado-Ana-false');
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'REUTILIZACAO_REFRESH_TOKEN' } }));
    expect(await screen.findByText('anônimo')).toBeInTheDocument();
  });
});
