import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Conta from './Conta';

const auth = { usuario: { nome: 'Ana' }, excluirConta: vi.fn(), logoutTodas: vi.fn() };
vi.mock('../context/useAuth', () => ({ useAuth: () => auth }));

describe('Conta', () => {
  beforeEach(() => {
    auth.excluirConta.mockReset();
    auth.logoutTodas.mockReset();
  });

  it('valida confirmação literal e encaminha senha para anonimização', async () => {
    const user = userEvent.setup();
    auth.excluirConta.mockResolvedValue();
    render(<MemoryRouter><Conta /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Excluir e anonimizar conta' }));
    expect(screen.getByText('Informe sua senha atual.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Senha atual'), 'Senha123');
    await user.type(screen.getByLabelText(/Digite EXCLUIR/), 'EXCLUIR');
    await user.click(screen.getByRole('button', { name: 'Excluir e anonimizar conta' }));
    expect(auth.excluirConta).toHaveBeenCalledWith({ senha: 'Senha123', confirmacao: 'EXCLUIR' });
  });

  it('encerra todas as sessões e anuncia falha do servidor', async () => {
    const user = userEvent.setup();
    auth.logoutTodas.mockRejectedValue(new Error('falhou'));
    render(<MemoryRouter><Conta /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Encerrar todas as sessões' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/sessão deste navegador foi encerrada/i);
  });

  it('mostra erro devolvido pela exclusão', async () => {
    const user = userEvent.setup();
    auth.excluirConta.mockRejectedValue(new Error('Confirmação inválida'));
    render(<MemoryRouter><Conta /></MemoryRouter>);
    await user.type(screen.getByLabelText('Senha atual'), 'Senha123');
    await user.type(screen.getByLabelText(/Digite EXCLUIR/), 'EXCLUIR');
    await user.click(screen.getByRole('button', { name: 'Excluir e anonimizar conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmação inválida');
  });
});
