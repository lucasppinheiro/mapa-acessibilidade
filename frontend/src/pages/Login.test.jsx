import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const autenticar = { login: vi.fn(), registrar: vi.fn() };
vi.mock('../context/useAuth', () => ({ useAuth: () => autenticar }));

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não solicita dado de deficiência e expõe erros associados', async () => {
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.queryByText(/tipo de deficiência/i)).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Entrar' }).at(-1));
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('valida a política de senha no cadastro', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Login /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.test');
    await user.type(screen.getByLabelText('Senha'), 'abcdefgh');
    await user.click(screen.getAllByRole('button', { name: 'Criar conta' }).at(-1));
    expect(screen.getByText(/maiúscula, uma minúscula e um número/i)).toBeInTheDocument();
  });
});
