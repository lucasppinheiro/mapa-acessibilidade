import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const auth = { autenticado: false, carregando: false, podeModerar: false, usuario: null, logout: vi.fn() };
vi.mock('./context/AuthContext', () => ({ AuthProvider: ({ children }) => children }));
vi.mock('./context/useAuth', () => ({ useAuth: () => auth }));
vi.mock('./pages/Home', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Home mock</h1></main> }));
vi.mock('./pages/Login', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Login mock</h1></main> }));
vi.mock('./pages/NovoLocal', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Novo mock</h1></main> }));
vi.mock('./pages/DetalhesLocal', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Detalhe mock</h1></main> }));
vi.mock('./pages/Privacidade', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Privacidade mock</h1></main> }));
vi.mock('./pages/Conta', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Conta mock</h1></main> }));
vi.mock('./pages/Moderacao', () => ({ default: () => <main id="conteudo-principal" tabIndex="-1"><h1>Moderação mock</h1></main> }));

describe('App', () => {
  beforeEach(() => {
    auth.autenticado = false;
    auth.carregando = false;
    auth.podeModerar = false;
    auth.usuario = null;
    window.history.pushState({}, '', '/');
  });

  it('renderiza rota pública e skip link', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo principal' })).toHaveAttribute('href', '#conteudo-principal');
    expect(screen.getByRole('heading', { name: 'Home mock' })).toBeInTheDocument();
  });

  it('redireciona rota privada anônima ao login', async () => {
    window.history.pushState({}, '', '/novo-local');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Login mock' })).toBeInTheDocument();
  });

  it('mostra estado de verificação da sessão', () => {
    auth.carregando = true;
    window.history.pushState({}, '', '/conta');
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sua sessão');
  });

  it('autoriza pessoa autenticada e protege moderação por papel', async () => {
    auth.autenticado = true;
    auth.usuario = { nome: 'Ana' };
    window.history.pushState({}, '', '/novo-local');
    const { unmount } = render(<App />);
    expect(screen.getByRole('heading', { name: 'Novo mock' })).toBeInTheDocument();
    unmount();
    window.history.pushState({}, '', '/moderacao');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Home mock' })).toBeInTheDocument();
  });

  it('libera moderação e apresenta 404 sem redirecionar', () => {
    auth.autenticado = true;
    auth.podeModerar = true;
    auth.usuario = { nome: 'Mod' };
    window.history.pushState({}, '', '/moderacao');
    const { unmount } = render(<App />);
    expect(screen.getByRole('heading', { name: 'Moderação mock' })).toBeInTheDocument();
    unmount();
    window.history.pushState({}, '', '/rota-inexistente');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
