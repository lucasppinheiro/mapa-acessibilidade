# Backend do AcessaMapa

API Express e MongoDB do AcessaMapa v1. O contrato público está em `../docs/openapi.yaml` e a visão geral do case está no `../README.md`.

## Desenvolvimento local

Requisitos: Node.js 24 e MongoDB em replica set, necessário para as transações de moderação, arquivamento e anonimização.

```bash
cp .env.example .env
npm install
npm run dev
```

Nunca use dados reais, credenciais reais ou evidências de cliente. A migração só inicia quando `MIGRATION_DATA_CONFIRMED_SYNTHETIC=true` confirma explicitamente que a base foi validada como sintética.

## Comandos

```bash
npm run lint
npm test
npm run coverage
npm run migrate
npm run seed
npm start
```

O seed é idempotente, usa apenas conteúdo marcado como fictício e exige `DEMO_SEED_PASSWORD` fora do repositório. Ele não cria conta moderadora.

## API

Todas as rotas usam o prefixo `/api/v1`:

- `auth`: registro, login, refresh, logout, perfil e exclusão anonimizada;
- `locais` e avaliações aninhadas;
- `denuncias` e `moderacao`;
- `geocodificacao`, somente por busca explícita;
- `health/live` e `health/ready`.

O access token é retornado ao cliente para armazenamento apenas em memória. O refresh token é opaco, persistido somente como hash e enviado em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
