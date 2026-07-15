import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const local = {
  id: '507f1f77bcf86cd799439011',
  nome: 'Biblioteca Sintética',
  endereco: 'Praça de Exemplo, 10',
  descricao: 'Local fictício para demonstrar a experiência.',
  categoria: 'servico_publico',
  autor: { id: '507f191e810c19729de860ea', nome: 'Pessoa fictícia' },
  recursos: { rampa: 'presente' },
  resumoAvaliacoes: { media: null, total: 0 },
  resumoRecursos: { rampa: { informado: 'presente', confirmacoes: 0, contestacoes: 0 } },
  localizacao: { type: 'Point', coordinates: [-46.6333, -23.5505] },
  criadoEm: '2026-01-01T00:00:00Z'
};

const usuario = { id: '507f191e810c19729de860ea', nome: 'Pessoa fictícia', papel: 'usuario' };

async function mockAuth(page, autenticado = false, papel = 'usuario') {
  await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({
    status: autenticado ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(autenticado
      ? { accessToken: 'token-e2e', usuario: { ...usuario, papel } }
      : { erro: { codigo: 'REFRESH_TOKEN_NAO_FORNECIDO', mensagem: 'Sessão ausente.', requestId: 'e2e' } })
  }));
}

async function mockApiPublica(page) {
  await page.route(/.*\/api\/v1\/locais(?:\?.*)?$/, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ local, moderacao: { status: 'pendente' } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ locais: [local], paginacao: { pagina: 1, limite: 20, total: 1, totalPaginas: 1, temProximaPagina: false } }) });
  });
  await page.route(`**/api/v1/locais/${local.id}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ local }) }));
  await page.route(`**/api/v1/locais/${local.id}/avaliacoes**`, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ id: '507f1f77bcf86cd799439012', status: 'pendente' })
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ avaliacoes: [], paginacao: { pagina: 1, total: 0, totalPaginas: 0, temProximaPagina: false } }) });
  });
}

async function esperarSemViolacoesSerias(page) {
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  const graves = resultado.violations.filter((item) => ['critical', 'serious'].includes(item.impact));
  expect(graves).toEqual([]);
}

test('lista é inicial e alternância para mapa funciona pelo teclado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await mockAuth(page, false);
  await mockApiPublica(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Biblioteca Sintética' })).toBeVisible();
  const mapa = page.getByRole('button', { name: /Mapa/ });
  const marcador = page.getByRole('button', { name: 'Marcador do local Biblioteca Sintética' });
  await expect(marcador).toHaveCount(0);
  await mapa.focus();
  await page.keyboard.press('Space');
  await expect(mapa).toHaveAttribute('aria-pressed', 'true');
  await expect(marcador).toBeVisible();
  await esperarSemViolacoesSerias(page);
});

test('login e privacidade não têm violações críticas ou sérias', async ({ page }) => {
  await mockAuth(page, false);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await esperarSemViolacoesSerias(page);
  await page.goto('/privacidade');
  await expect(page.getByRole('heading', { name: 'Privacidade' })).toBeVisible();
  await esperarSemViolacoesSerias(page);
});

test('negação de geolocalização não bloqueia cadastro manual', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok, erro) => erro({ code: 1, message: 'negado' }) }
    });
  });
  await mockAuth(page, true);
  await mockApiPublica(page);
  await page.goto('/novo-local');
  await page.getByRole('button', { name: 'Usar minha localização' }).click();
  await expect(page.getByText(/Localização não compartilhada/)).toBeVisible();
  await page.getByLabel('Nome do local').fill('Local de teste');
  await page.getByLabel('Endereço ou referência').fill('Rua de Teste, 1');
  await page.getByLabel('Descrição').fill('Descrição sintética para o teste de cadastro.');
  await page.getByLabel('Latitude').fill('-23.5');
  await page.getByLabel('Longitude').fill('-46.6');
  await page.getByRole('button', { name: 'Enviar para moderação' }).click();
  await expect(page.getByRole('heading', { name: 'Acessibilidade informada pela comunidade' })).toBeVisible();
  await esperarSemViolacoesSerias(page);
});

test('detalhes, conta e moderação passam axe nas fixtures sintéticas', async ({ page }) => {
  await mockAuth(page, true, 'moderador');
  await mockApiPublica(page);
  await page.route(/.*\/api\/v1\/moderacao(?:\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ itens: [], paginacao: { pagina: 1, total: 0 } }) }));
  await page.route('**/api/v1/moderacao/historico**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ eventos: [], paginacao: { pagina: 1, total: 0 } }) }));

  await page.goto(`/local/${local.id}`);
  await expect(page.getByRole('heading', { name: 'Biblioteca Sintética' })).toBeVisible();
  const marcador = page.getByRole('button', { name: 'Marcador do local Biblioteca Sintética' });
  await expect(marcador).toHaveCount(0);
  const resumoMapa = page.getByText('Ver no mapa (opcional)');
  await resumoMapa.focus();
  await page.keyboard.press('Enter');
  await expect(marcador).toBeVisible();
  await esperarSemViolacoesSerias(page);
  await page.goto('/conta');
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await esperarSemViolacoesSerias(page);
  await page.goto('/moderacao');
  await expect(page.getByRole('heading', { name: 'Fila de moderação' })).toBeVisible();
  await esperarSemViolacoesSerias(page);
});

test('busca, filtro, consulta, avaliação e cadastro funcionam somente com teclado', async ({ page }) => {
  await mockAuth(page, true);
  await mockApiPublica(page);
  await page.goto('/');

  const busca = page.getByLabel('Buscar por nome ou endereço');
  await busca.focus();
  await page.keyboard.type('Biblioteca');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Biblioteca Sintética' })).toBeVisible();

  const abrirFiltros = page.getByRole('button', { name: 'Filtros' });
  await abrirFiltros.focus();
  await page.keyboard.press('Enter');
  const categoria = page.getByLabel('Categoria');
  await categoria.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(categoria).not.toHaveValue('');

  const detalhes = page.getByRole('link', { name: 'Biblioteca Sintética' });
  await detalhes.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Biblioteca Sintética' })).toBeVisible();

  const nota = page.getByRole('radio', { name: '5 estrelas' });
  await nota.focus();
  await page.keyboard.press('Space');
  const comentario = page.getByLabel('Comentário');
  await comentario.focus();
  await page.keyboard.type('Avaliação sintética feita somente com teclado.');
  const recursoPresente = page.getByRole('radio', { name: 'Presente' }).first();
  await recursoPresente.focus();
  await page.keyboard.press('Space');
  const enviarAvaliacao = page.getByRole('button', { name: 'Enviar para moderação' });
  await enviarAvaliacao.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Avaliação enviada para moderação.')).toBeVisible();

  const cadastrar = page.getByRole('link', { name: /Cadastrar local/ });
  await cadastrar.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Cadastrar local' })).toBeVisible();

  const campos = [
    ['Nome do local', 'Local de teclado'],
    ['Endereço ou referência', 'Rua Sintética, 10'],
    ['Descrição', 'Cadastro sintético concluído usando somente o teclado.'],
    ['Latitude', '-23.5'],
    ['Longitude', '-46.6']
  ];
  for (const [rotulo, valor] of campos) {
    const campo = page.getByLabel(rotulo);
    await campo.focus();
    await page.keyboard.type(valor);
  }
  const enviarLocal = page.getByRole('button', { name: 'Enviar para moderação' });
  await enviarLocal.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Acessibilidade informada pela comunidade' })).toBeVisible();
});
