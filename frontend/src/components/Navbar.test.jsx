import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

const auth = { autenticado: false, podeModerar: false, usuario: null, logout: vi.fn() };
vi.mock('../context/useAuth', () => ({ useAuth: () => auth }));

describe('Navbar', () => {
  beforeEach(() => {
    auth.autenticado = false;
    auth.podeModerar = false;
    auth.usuario = null;
    auth.logout.mockReset();
  });

  it('abre e fecha o menu com Escape, devolvendo foco', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    const botao = screen.getByRole('button', { name: 'Abrir menu' });
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(botao).toHaveFocus();
    expect(botao).toHaveAttribute('aria-expanded', 'false');
  });

  it('mostra rotas privadas e encerra sessão autenticada', async () => {
    const user = userEvent.setup();
    auth.autenticado = true;
    auth.podeModerar = true;
    auth.usuario = { nome: 'Moderação' };
    auth.logout.mockResolvedValue();
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Moderação' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conta de Moderação' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(auth.logout).toHaveBeenCalled();
  });
});
