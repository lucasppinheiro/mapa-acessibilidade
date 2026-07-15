import { useState } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RouteFocus from './RouteFocus';

function ConteudoAdiado({ comAnteriorOculto = false }) {
  const [pronto, setPronto] = useState(false);
  if (pronto) return <main id="conteudo-principal" tabIndex="-1">Privacidade final</main>;
  return (
    <>
      {comAnteriorOculto && <div hidden><main id="conteudo-principal" tabIndex="-1">Conteúdo anterior oculto</main></div>}
      <main id="conteudo-principal" data-route-loading tabIndex="-1">Carregando página</main>
      <button type="button" onClick={() => setPronto(true)}>Concluir carregamento</button>
    </>
  );
}

describe('RouteFocus', () => {
  it('atualiza o título sem tirar o skip link da ordem inicial de foco', async () => {
    const { container } = render(<MemoryRouter initialEntries={['/privacidade']}><RouteFocus /><main id="conteudo-principal" tabIndex="-1" /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe('Privacidade | AcessaMapa'));
    expect(container.querySelector('main')).not.toHaveFocus();
  });

  it('move o foco para o conteúdo final após navegação SPA', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteFocus />
        <Link to="/privacidade">Abrir privacidade</Link>
        <Routes>
          <Route path="/" element={<main id="conteudo-principal" tabIndex="-1">Início</main>} />
          <Route path="/privacidade" element={<main id="conteudo-principal" tabIndex="-1">Privacidade</main>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('link', { name: 'Abrir privacidade' }));
    await waitFor(() => expect(screen.getByText('Privacidade')).toHaveFocus());
    expect(document.title).toBe('Privacidade | AcessaMapa');
  });

  it('ignora conteúdo anterior oculto enquanto aguarda uma rota lazy', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteFocus />
        <Link to="/privacidade">Abrir rota adiada</Link>
        <Routes>
          <Route path="/" element={<main id="conteudo-principal" tabIndex="-1">Início</main>} />
          <Route path="/privacidade" element={<ConteudoAdiado comAnteriorOculto />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('link', { name: 'Abrir rota adiada' }));
    expect(screen.getByText('Conteúdo anterior oculto')).not.toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Concluir carregamento' }));
    await waitFor(() => expect(screen.getByText('Privacidade final')).toHaveFocus());
  });

  it('transfere para o conteúdo final o foco solicitado no fallback inicial', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/privacidade']}>
        <RouteFocus />
        <ConteudoAdiado />
      </MemoryRouter>
    );
    const fallback = screen.getByText('Carregando página');
    fallback.focus();
    expect(fallback).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Concluir carregamento' }));
    await waitFor(() => expect(screen.getByText('Privacidade final')).toHaveFocus());
  });

  it('nomeia páginas de detalhe', async () => {
    render(<MemoryRouter initialEntries={['/local/1']}><RouteFocus /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe('Detalhes do local | AcessaMapa'));
  });
});
