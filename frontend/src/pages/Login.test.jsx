import { axe } from 'jest-axe';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const autenticar = { login: vi.fn(), registrar: vi.fn() };
vi.mock('../context/useAuth', () => ({ useAuth: () => autenticar }));

function DestinoAposLogin() {
  const location = useLocation();
  return (
    <>
      <p>Destino {location.pathname}</p>
      <output data-testid="estado-destino">{JSON.stringify(location.state)}</output>
    </>
  );
}

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

  it('retorna ao cadastro com pré-preenchimento seguro após autenticar', async () => {
    const user = userEvent.setup();
    autenticar.login.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/login',
        state: {
          destino: '/novo-local',
          preenchimentoLocal: {
            endereco: 'Rua Fictícia, 10',
            latitude: '-23.5',
            longitude: '-46.6',
            email: 'remover@example.test',
            token: 'remover'
          },
          accessToken: 'remover'
        }
      }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/novo-local" element={<DestinoAposLogin />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Entre para continuar o cadastro do local.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@example.test');
    await user.type(screen.getByLabelText('Senha'), 'Senha123');
    await user.click(screen.getAllByRole('button', { name: 'Entrar' }).at(-1));

    expect(autenticar.login).toHaveBeenCalledWith('pessoa@example.test', 'Senha123');
    expect(await screen.findByText('Destino /novo-local')).toBeInTheDocument();
    expect(screen.getByTestId('estado-destino')).toHaveTextContent(JSON.stringify({
      preenchimentoLocal: { endereco: 'Rua Fictícia, 10', latitude: '-23.5', longitude: '-46.6' }
    }));
  });

  it('retorna ao detalhe após autenticar', async () => {
    const user = userEvent.setup();
    autenticar.login.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { destino: '/local/local-1' } }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/local/:id" element={<DestinoAposLogin />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/voltar ao local e continuar sua contribuição/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@example.test');
    await user.type(screen.getByLabelText('Senha'), 'Senha123');
    await user.click(screen.getAllByRole('button', { name: 'Entrar' }).at(-1));
    expect(await screen.findByText('Destino /local/local-1')).toBeInTheDocument();
    expect(screen.getByTestId('estado-destino')).toHaveTextContent('null');
  });
});
