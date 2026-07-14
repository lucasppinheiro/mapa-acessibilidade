import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RouteFocus from './RouteFocus';

describe('RouteFocus', () => {
  it('atualiza título e move foco para o conteúdo', async () => {
    const { container } = render(<MemoryRouter initialEntries={['/privacidade']}><RouteFocus /><main id="conteudo-principal" tabIndex="-1" /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe('Privacidade | AcessaMapa'));
    expect(container.querySelector('main')).toHaveFocus();
  });

  it('nomeia detalhes e usa fallback para rota desconhecida', async () => {
    const { rerender } = render(<MemoryRouter initialEntries={['/local/1']}><RouteFocus /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe('Detalhes do local | AcessaMapa'));
    rerender(<MemoryRouter initialEntries={['/outra']}><RouteFocus /></MemoryRouter>);
  });
});
