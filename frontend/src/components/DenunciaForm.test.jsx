import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DenunciaForm from './DenunciaForm';
import { criarDenuncia } from '../services/api';

const auth = { autenticado: true };
vi.mock('../context/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../services/api', () => ({
  criarDenuncia: vi.fn(),
  extrairMensagemErro: (_error, fallback) => fallback
}));

function Caminho() {
  const location = useLocation();
  return (
    <>
      <span data-testid="caminho">{location.pathname}</span>
      <output data-testid="estado-navegacao">{JSON.stringify(location.state)}</output>
    </>
  );
}

describe('DenunciaForm', () => {
  beforeEach(() => {
    auth.autenticado = true;
    criarDenuncia.mockReset();
  });

  it('envia motivo e detalhes para moderação', async () => {
    const user = userEvent.setup();
    criarDenuncia.mockResolvedValue({});
    render(<MemoryRouter><DenunciaForm alvoTipo="local" alvoId="l1" /></MemoryRouter>);
    await user.click(screen.getByText('Denunciar este conteúdo'));
    await user.selectOptions(screen.getByLabelText('Motivo'), 'outro');
    await user.type(screen.getByLabelText('Detalhes (opcional)'), 'Informação divergente');
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect(criarDenuncia).toHaveBeenCalledWith({ alvoTipo: 'local', alvoId: 'l1', motivo: 'outro', detalhes: 'Informação divergente' });
    expect(await screen.findByRole('status')).toHaveTextContent('Denúncia enviada');
  });

  it('direciona pessoa anônima ao login', async () => {
    const user = userEvent.setup();
    auth.autenticado = false;
    render(<MemoryRouter><DenunciaForm alvoTipo="avaliacao" alvoId="a1" /><Caminho /></MemoryRouter>);
    await user.click(screen.getByText('Denunciar este conteúdo'));
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login');
    expect(screen.getByTestId('estado-navegacao')).toHaveTextContent(JSON.stringify({ destino: '/' }));
  });

  it('anuncia falha sem perder os dados', async () => {
    const user = userEvent.setup();
    criarDenuncia.mockRejectedValue(new Error('falhou'));
    render(<MemoryRouter><DenunciaForm alvoTipo="local" alvoId="l1" /></MemoryRouter>);
    await user.click(screen.getByText('Denunciar este conteúdo'));
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Não foi possível');
  });
});
