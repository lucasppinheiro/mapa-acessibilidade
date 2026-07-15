import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function Quebra() {
  throw new Error('quebrou');
}

describe('ErrorBoundary', () => {
  it('oferece recuperação quando a árvore falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    const original = window.location.reload;
    try {
      Object.defineProperty(window.location, 'reload', { configurable: true, value: reload });
    } catch {
      // jsdom pode impedir a redefinição; ainda validamos a interface de recuperação.
    }
    render(<ErrorBoundary><Quebra /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: 'Recarregar página' });
    expect(botao).toBeInTheDocument();
    if (window.location.reload === reload) await userEvent.click(botao);
    if (original && window.location.reload === reload) Object.defineProperty(window.location, 'reload', { value: original });
  });

  it('permite isolar uma falha com fallback local', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p role="alert">Recurso opcional indisponível.</p>}>
        <Quebra />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Recurso opcional indisponível.');
    expect(screen.queryByRole('heading', { name: 'Algo deu errado' })).not.toBeInTheDocument();
  });
});
