import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  const api = vi.fn().mockResolvedValue({ data: 'repetida' });
  Object.assign(api, {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: requestUse }, response: { use: responseUse } }
  });
  const refresh = { post: vi.fn() };
  const create = vi.fn()
    .mockImplementationOnce(() => api)
    .mockImplementationOnce(() => refresh);
  return { api, refresh, create, requestUse, responseUse };
});

vi.mock('axios', () => ({ default: { create: fake.create } }));

import * as cliente from './api';

describe('cliente da API', () => {
  beforeEach(() => {
    fake.api.mockClear();
    fake.api.get.mockClear();
    fake.api.post.mockClear();
    fake.api.patch.mockClear();
    fake.api.delete.mockClear();
    fake.refresh.post.mockReset();
    cliente.limparAccessToken();
  });

  it('mantém token em memória e o injeta somente no cabeçalho', () => {
    const interceptor = fake.requestUse.mock.calls[0][0];
    cliente.definirAccessToken('segredo');
    const config = interceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer segredo');
    cliente.limparAccessToken();
    expect(interceptor({ headers: {} }).headers.Authorization).toBeUndefined();
  });

  it('expõe todas as rotas versionadas com DTOs explícitos', () => {
    cliente.registrar({}); cliente.login({}); cliente.obterPerfil(); cliente.logoutAtual(); cliente.logoutTodas(); cliente.excluirConta({ senha: 'x' });
    cliente.listarLocais({ pagina: 1 }); cliente.obterLocal('l'); cliente.criarLocal({}); cliente.atualizarLocal('l', {}); cliente.arquivarLocal('l');
    cliente.listarAvaliacoes('l', { pagina: 1 }); cliente.criarAvaliacao('l', {}); cliente.arquivarAvaliacao('l', 'a');
    cliente.buscarEndereco('rua'); cliente.criarDenuncia({}); cliente.listarFilaModeracao({}); cliente.aprovarConteudo('local', 'l'); cliente.rejeitarConteudo('local', 'l', 'motivo'); cliente.listarHistoricoModeracao({});
    expect(fake.api.patch).toHaveBeenCalledWith('/locais/l', {});
    expect(fake.api.delete).toHaveBeenCalledWith('/auth/perfil', { data: { senha: 'x' } });
    expect(fake.api.get).toHaveBeenCalledWith('/geocodificacao', { params: { q: 'rua' } });
    expect(fake.api.post).toHaveBeenCalledWith('/moderacao/local/l/rejeitar', { motivo: 'motivo' });
  });

  it('renova cookie opaco em 401 e repete a requisição', async () => {
    const rejeicao = fake.responseUse.mock.calls[0][1];
    fake.refresh.post.mockResolvedValue({ data: { accessToken: 'novo' } });
    const original = { url: '/locais', headers: {} };
    await rejeicao({ response: { status: 401, data: { erro: { codigo: 'TOKEN_EXPIRADO' } } }, config: original });
    expect(fake.refresh.post).toHaveBeenCalledWith('/auth/refresh');
    expect(fake.api).toHaveBeenCalledWith(expect.objectContaining({ _retry: true }));
  });

  it('limpa sessão e emite evento quando a renovação falha', async () => {
    const rejeicao = fake.responseUse.mock.calls[0][1];
    const listener = vi.fn();
    window.addEventListener('auth:logout', listener);
    fake.refresh.post.mockRejectedValue(new Error('falhou'));
    const error = { response: { status: 401, data: { erro: { codigo: 'SESSAO_REVOGADA' } } }, config: { url: '/locais', headers: {} } };
    await expect(rejeicao(error)).rejects.toBe(error);
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('auth:logout', listener);
  });

  it('não tenta refresh recursivo em rotas de autenticação e formata mensagens', async () => {
    const [sucesso, rejeicao] = fake.responseUse.mock.calls[0];
    expect(sucesso({ ok: true })).toEqual({ ok: true });
    const error = { response: { status: 400, data: { erro: { codigo: 'DADOS_INVALIDOS', mensagem: 'Revise.' } } }, config: { url: '/auth/login' } };
    expect(cliente.extrairMensagemErro(error, 'fallback')).toBe('Revise.');
    expect(cliente.extrairMensagemErro({}, 'fallback')).toBe('fallback');
    await expect(rejeicao(error)).rejects.toBe(error);
  });
});
