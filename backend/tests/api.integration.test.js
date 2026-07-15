const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { execFileSync } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret-with-at-least-32-characters';
process.env.REFRESH_COOKIE_SECURE = 'false';
process.env.DEMO_WRITE_MODE = 'moderated';

const app = require('../app');
const User = require('../models/User');
const Local = require('../models/Local');
const Avaliacao = require('../models/Avaliacao');
const Session = require('../models/Session');
const AuditEvent = require('../models/AuditEvent');
const Denuncia = require('../models/Denuncia');
const GeocodeCache = require('../models/GeocodeCache');
const { recalcularMedia } = require('../utils/calcularMedia');

let replSet;

const userData = (suffix = 'um') => ({
  nome: `Pessoa Demo ${suffix}`,
  email: `${suffix}@example.invalid`,
  senha: 'SenhaForte123'
});

const localData = () => ({
  nome: 'Centro Comunitário Fictício',
  descricao: 'Descrição totalmente sintética para o teste automatizado.',
  endereco: 'Rua de Teste, 10 — endereço fictício',
  categoria: 'servico_publico',
  localizacao: { type: 'Point', coordinates: [-46.63, -23.55] },
  recursos: { rampa: 'presente', elevador: 'desconhecido' }
});

const register = async (agent, suffix) => {
  const response = await agent.post('/api/v1/auth/registro').send(userData(suffix)).expect(201);
  return {
    token: response.body.accessToken,
    usuario: response.body.usuario,
    cookie: response.headers['set-cookie']?.[0]?.split(';')[0]
  };
};

const createModerator = async () => {
  await User.create({ ...userData('moderador'), papel: 'moderador' });
  const response = await request(app).post('/api/v1/auth/login').send({
    email: 'moderador@example.invalid',
    senha: 'SenhaForte123'
  }).expect(200);
  return response.body.accessToken;
};

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGODB_URI = replSet.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), Local.init(), Avaliacao.init(), Session.init(), AuditEvent.init(), Denuncia.init(), GeocodeCache.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  process.env.DEMO_WRITE_MODE = 'moderated';
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

describe('segurança, DTOs e moderação', () => {
  test('mass assignment não altera governança e conteúdo pendente não é público', async () => {
    const agent = request.agent(app);
    const { token } = await register(agent, 'autor');
    const attackerId = new mongoose.Types.ObjectId();
    const response = await agent
      .post('/api/v1/locais')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...localData(),
        autor: attackerId,
        status: 'aprovado',
        mediaAvaliacao: 5,
        totalAvaliacoesAprovadas: 999,
        createdAt: new Date('2000-01-01')
      })
      .expect(202);

    const stored = await Local.findById(response.body.id);
    expect(String(stored.autor)).not.toBe(String(attackerId));
    expect(stored.status).toBe('pendente');
    expect(stored.mediaAvaliacao).toBeNull();
    expect(stored.totalAvaliacoesAprovadas).toBe(0);
    expect(stored.createdAt.getFullYear()).not.toBe(2000);

    const hidden = await request(app).get('/api/v1/locais').expect(200);
    expect(hidden.body.locais).toHaveLength(0);

    const moderatorToken = await createModerator();
    await request(app)
      .post(`/api/v1/moderacao/local/${stored.id}/aprovar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);

    const visible = await request(app).get('/api/v1/locais').expect(200);
    expect(visible.body.locais).toHaveLength(1);
    const serialized = JSON.stringify(visible.body);
    expect(serialized).not.toContain('@example.invalid');
    expect(serialized).not.toContain('tipoDeficiencia');
    expect(serialized).not.toContain('tokenVersion');
    expect(visible.body.locais[0].autor).not.toHaveProperty('papel');
  });

  test('refresh token é rotacionado, reutilização revoga somente a família comprometida', async () => {
    const { cookie: firstCookie } = await register(request(app), 'rotacao');
    expect(firstCookie).toBeTruthy();

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie).expect(200);
    expect(refresh.body.accessToken).toEqual(expect.any(String));
    const secondCookie = refresh.headers['set-cookie'][0].split(';')[0];
    expect(secondCookie).not.toBe(firstCookie);

    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(401);
    expect(reuse.body.erro.codigo).toBe('REUTILIZACAO_REFRESH_TOKEN');

    const revoked = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', secondCookie)
      .expect(401);
    expect(revoked.body.erro.codigo).toBe('SESSAO_REVOGADA');
  });

  test('matriz de permissão e média usam apenas avaliações aprovadas', async () => {
    const authorAgent = request.agent(app);
    const { token: authorToken } = await register(authorAgent, 'contribuidor');
    const moderatorToken = await createModerator();

    const created = await authorAgent
      .post('/api/v1/locais')
      .set('Authorization', `Bearer ${authorToken}`)
      .send(localData())
      .expect(202);

    await authorAgent
      .get('/api/v1/moderacao')
      .set('Authorization', `Bearer ${authorToken}`)
      .expect(403);
    await request(app)
      .post(`/api/v1/moderacao/local/${created.body.id}/aprovar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);

    const reviewerAgent = request.agent(app);
    const { token: reviewerToken } = await register(reviewerAgent, 'avaliador');
    const review = await reviewerAgent
      .post(`/api/v1/locais/${created.body.id}/avaliacoes`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        nota: 5,
        comentario: 'Comentário sintético suficientemente longo.',
        observacoesRecursos: { rampa: 'presente', elevador: 'ausente' },
        status: 'aprovado',
        autor: new mongoose.Types.ObjectId()
      })
      .expect(202);

    let storedLocal = await Local.findById(created.body.id);
    expect(storedLocal.mediaAvaliacao).toBeNull();
    expect((await request(app).get(`/api/v1/locais/${created.body.id}/avaliacoes`).expect(200)).body.avaliacoes).toHaveLength(0);

    await request(app)
      .post(`/api/v1/moderacao/avaliacao/${review.body.id}/aprovar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);
    storedLocal = await Local.findById(created.body.id);
    expect(storedLocal.mediaAvaliacao).toBe(5);
    expect(storedLocal.totalAvaliacoesAprovadas).toBe(1);

    const detail = await request(app).get(`/api/v1/locais/${created.body.id}`).expect(200);
    expect(detail.body.local.resumoRecursos.rampa.confirmacoes).toBe(1);
    expect(detail.body.local.resumoRecursos.elevador.observacoesAusente).toBe(1);
  });

  test('denúncia e histórico preservam rastreabilidade sem dados sensíveis', async () => {
    const authorAgent = request.agent(app);
    const { token } = await register(authorAgent, 'denunciante');
    const moderatorToken = await createModerator();
    const user = await User.findOne({ nome: 'Pessoa Demo denunciante' });
    const local = await Local.create({ ...localData(), autor: user._id, status: 'aprovado' });

    const report = await authorAgent
      .post('/api/v1/denuncias')
      .set('Authorization', `Bearer ${token}`)
      .send({ alvoTipo: 'local', alvoId: local.id, motivo: 'informacao_incorreta', detalhes: 'Relato sintético.' })
      .expect(202);
    await request(app)
      .post(`/api/v1/moderacao/denuncia/${report.body.id}/aprovar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);

    const history = await request(app)
      .get('/api/v1/moderacao/historico')
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);
    const serialized = JSON.stringify(history.body);
    expect(history.body.eventos.length).toBeGreaterThan(0);
    expect(serialized).not.toContain('@example.invalid');
    expect(serialized).not.toContain('senha');
    expect(serialized).not.toContain('tokenHash');
    expect(serialized).not.toContain('ipHash');
  });

  test('exclusão exige senha e confirmação e anonimiza sem apagar contribuições', async () => {
    const agent = request.agent(app);
    const { token, usuario } = await register(agent, 'exclusao');
    const user = await User.findById(usuario.id);
    const local = await Local.create({ ...localData(), autor: user._id, status: 'aprovado' });

    await agent
      .delete('/api/v1/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha: 'incorreta', confirmacao: 'EXCLUIR' })
      .expect(400);
    await agent
      .delete('/api/v1/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha: 'SenhaForte123', confirmacao: 'EXCLUIR' })
      .expect(204);

    const deletedUser = await User.findById(user._id).select('+email');
    expect(deletedUser.nome).toBe('Usuário removido');
    expect(deletedUser.email).toMatch(/@invalid\.local$/);
    expect(await Local.exists({ _id: local._id })).toBeTruthy();
  });

  test('erros seguem o envelope e modo read_only bloqueia escrita', async () => {
    const malformed = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(malformed.body.erro).toMatchObject({ codigo: 'JSON_INVALIDO' });
    expect(malformed.body.erro.requestId).toEqual(expect.any(String));

    process.env.DEMO_WRITE_MODE = 'read_only';
    const response = await request(app).post('/api/v1/auth/registro').send(userData('bloqueado')).expect(503);
    expect(response.body.erro.codigo).toBe('DEMO_SOMENTE_LEITURA');
    expect(response.body.erro.mensagem).toContain('somente leitura');
    await request(app).get('/api/v1/health/live').expect(200, { status: 'vivo' });
    await request(app).get('/api/v1/health/ready').expect(200, { status: 'pronto', banco: 'conectado' });
  });

  test('perfil, logout atual e logout global seguem o ciclo de sessão', async () => {
    const agent = request.agent(app);
    const { token, cookie } = await register(agent, 'perfil');
    const profile = await agent
      .get('/api/v1/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profile.body.usuario).toMatchObject({
      email: 'perfil@example.invalid',
      papel: 'usuario'
    });

    const updated = await agent
      .patch('/api/v1/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nome Atualizado', bio: 'Bio sintética atualizada.', papel: 'admin', email: 'outro@example.invalid' })
      .expect(200);
    expect(updated.body.usuario.nome).toBe('Nome Atualizado');
    expect(updated.body.usuario.papel).toBe('usuario');
    expect(updated.body.usuario.email).toBe('perfil@example.invalid');

    await agent.post('/api/v1/auth/logout-todas').set('Authorization', `Bearer ${token}`).expect(204);
    await agent.get('/api/v1/auth/perfil').set('Authorization', `Bearer ${token}`).expect(401);
    await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    await request(app).post('/api/v1/auth/logout').set('Cookie', cookie).expect(204);
  });

  test('edição material retorna à fila e arquivamento respeita autoria', async () => {
    const ownerAgent = request.agent(app);
    const { token: ownerToken, usuario: owner } = await register(ownerAgent, 'proprietario');
    const otherAgent = request.agent(app);
    const { token: otherToken } = await register(otherAgent, 'terceiro');
    const moderatorToken = await createModerator();
    const local = await Local.create({ ...localData(), autor: owner.id, status: 'aprovado' });

    await otherAgent
      .patch(`/api/v1/locais/${local.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ nome: 'Tentativa de alteração indevida' })
      .expect(403);

    await ownerAgent
      .patch(`/api/v1/locais/${local.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ nome: 'Centro Fictício Atualizado' })
      .expect(202);
    expect((await Local.findById(local.id)).status).toBe('pendente');

    const queue = await request(app)
      .get('/api/v1/moderacao?tipo=local')
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);
    expect(queue.body.itens.some((item) => item.id === local.id)).toBe(true);
    await request(app)
      .post(`/api/v1/moderacao/local/${local.id}/rejeitar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ motivo: 'Descrição precisa de mais detalhes objetivos.' })
      .expect(200);
    expect((await Local.findById(local.id)).status).toBe('rejeitado');

    await ownerAgent
      .patch(`/api/v1/locais/${local.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ descricao: 'Descrição sintética revisada com detalhes suficientes para nova análise.' })
      .expect(202);
    await request(app)
      .post(`/api/v1/moderacao/local/${local.id}/aprovar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);

    const filtered = await request(app)
      .get('/api/v1/locais')
      .query({ categoria: 'servico_publico', recurso: 'rampa', oeste: -47, sul: -24, leste: -46, norte: -23, busca: 'Atualizado' })
      .expect(200);
    expect(filtered.body.locais).toHaveLength(1);

    await otherAgent
      .delete(`/api/v1/locais/${local.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    await ownerAgent
      .delete(`/api/v1/locais/${local.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    expect((await Local.findById(local.id)).status).toBe('arquivado');
  });

  test('busca de locais tolera acentos sem interpretar operadores de regex', async () => {
    const autor = await User.create(userData('busca-acentos'));
    await Local.create([
      {
        ...localData(),
        nome: 'Praça das Flores',
        autor: autor._id,
        status: 'aprovado'
      },
      {
        ...localData(),
        nome: 'Praca Municipal',
        endereco: 'Avenida sem acentos, 20',
        autor: autor._id,
        status: 'aprovado'
      }
    ]);

    const semAcento = await request(app)
      .get('/api/v1/locais')
      .query({ busca: 'Praca' })
      .expect(200);
    expect(semAcento.body.locais.map((local) => local.nome)).toEqual(
      expect.arrayContaining(['Praça das Flores', 'Praca Municipal'])
    );

    const comAcento = await request(app)
      .get('/api/v1/locais')
      .query({ busca: 'Praça' })
      .expect(200);
    expect(comAcento.body.locais.map((local) => local.nome)).toEqual(
      expect.arrayContaining(['Praça das Flores', 'Praca Municipal'])
    );

    const tentativaRegex = await request(app)
      .get('/api/v1/locais')
      .query({ busca: '.*' })
      .expect(200);
    expect(tentativaRegex.body.locais).toHaveLength(0);
  });

  test('arquivamento de avaliação aprovada recalcula a média e protege terceiros', async () => {
    const ownerAgent = request.agent(app);
    const { token: ownerToken, usuario: owner } = await register(ownerAgent, 'autoravaliacao');
    const otherAgent = request.agent(app);
    const { token: otherToken } = await register(otherAgent, 'naoautor');
    const local = await Local.create({ ...localData(), autor: owner.id, status: 'aprovado' });
    const review = await Avaliacao.create({
      local: local._id,
      autor: owner.id,
      nota: 3,
      comentario: 'Avaliação sintética aprovada para teste de arquivamento.',
      status: 'aprovado'
    });
    await recalcularMedia(local._id);
    expect((await Local.findById(local._id)).mediaAvaliacao).toBe(3);

    await otherAgent
      .delete(`/api/v1/locais/${local.id}/avaliacoes/${review.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    await ownerAgent
      .delete(`/api/v1/locais/${local.id}/avaliacoes/${review.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    expect((await Avaliacao.findById(review.id)).status).toBe('arquivado');
    expect((await Local.findById(local._id)).mediaAvaliacao).toBeNull();
  });

  test('geocodificação usa busca explícita, cache e falha padronizada', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ place_id: 123, display_name: 'Endereço fictício encontrado', lon: '-46.63', lat: '-23.55' }]
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const first = await request(app).get('/api/v1/geocodificacao').query({ q: 'Endereço fictício 123' }).expect(200);
      expect(first.headers['x-cache']).toBe('MISS');
      expect(first.body.resultados[0]).toMatchObject({
        endereco: 'Endereço fictício encontrado',
        localizacao: { type: 'Point', coordinates: [-46.63, -23.55] }
      });
      const second = await request(app).get('/api/v1/geocodificacao').query({ q: '  endereço   FICTÍCIO 123 ' }).expect(200);
      expect(second.headers['x-cache']).toBe('HIT');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockRejectedValueOnce(new Error('upstream indisponível'));
      const failed = await request(app).get('/api/v1/geocodificacao').query({ q: 'Outro endereço fictício' }).expect(502);
      expect(failed.body.erro.codigo).toBe('PROVEDOR_GEOCODIFICACAO_INDISPONIVEL');
      await request(app).get('/api/v1/geocodificacao').query({ q: 'ab' }).expect(422);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('falhas comuns retornam códigos previsíveis e request ID', async () => {
    const agent = request.agent(app);
    await register(agent, 'duplicado');
    await agent.post('/api/v1/auth/registro').send(userData('duplicado')).expect(409);
    await request(app).post('/api/v1/auth/login').send({ email: 'duplicado@example.invalid', senha: 'errada' }).expect(401);
    await request(app).get('/api/v1/auth/perfil').expect(401);
    await request(app).get('/api/v1/auth/perfil').set('Authorization', 'Bearer token-invalido').expect(401);
    const invalid = await request(app).get('/api/v1/locais/invalido').expect(422);
    expect(invalid.body.erro.requestId).toEqual(expect.any(String));
    await request(app).get(`/api/v1/locais/${new mongoose.Types.ObjectId()}`).expect(404);
    await request(app).get('/api/v1/rota-inexistente').expect(404);
    await request(app).get('/api/v1/locais').query({ oeste: -47 }).expect(400);
    await request(app).get('/api/v1/locais').query({ bbox: '-47,-24,-46,-23', notaMinima: 3 }).expect(200);
    const requestId = await request(app).get('/api/v1/health/live').set('x-request-id', 'teste-request-id').expect(200);
    expect(requestId.headers['x-request-id']).toBe('teste-request-id');
  });

  test('seed e migração são idempotentes e operam somente com confirmação explícita', async () => {
    const backendDirectory = path.resolve(__dirname, '..');
    const commandEnv = {
      ...process.env,
      MONGODB_URI: process.env.MONGODB_URI,
      ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
      DEMO_SEED_PASSWORD: 'SenhaSeedForte123',
      MIGRATION_DATA_CONFIRMED_SYNTHETIC: 'true'
    };
    for (let index = 0; index < 2; index += 1) {
      execFileSync(process.execPath, ['scripts/seed.js'], { cwd: backendDirectory, env: commandEnv, stdio: 'pipe' });
      execFileSync(process.execPath, ['scripts/migrate-v1.js'], { cwd: backendDirectory, env: commandEnv, stdio: 'pipe' });
    }
    expect(await User.countDocuments({ email: /@example\.invalid$/ })).toBe(2);
    expect(await Local.countDocuments({ origemSinteticaId: { $exists: true } })).toBe(2);
    expect(await Avaliacao.countDocuments({ origemSinteticaId: { $exists: true } })).toBe(1);
    const migrated = await Local.findOne({ origemSinteticaId: 'local-biblioteca-demo' }).select('+origemSinteticaId');
    expect(migrated.localizacao.type).toBe('Point');
    expect(migrated.recursos.rampa).toBe('presente');
  });
});
