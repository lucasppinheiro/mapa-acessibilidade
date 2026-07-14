# AcessaMapa — frontend

Interface React da demonstração AcessaMapa v1. O estudo de caso, a arquitetura e as limitações estão documentados no README da raiz do repositório.

## Jornadas

- consulta por lista textual em todos os tamanhos de tela;
- mapa opcional, com as mesmas rotas de detalhes da lista;
- busca e filtros paginados;
- cadastro com busca explícita de endereço, coordenadas editáveis e geolocalização opcional;
- avaliações com nota em rádios nativos e observações tri-state dos recursos;
- denúncia, conta, privacidade e fila de moderação.

O cliente usa `/api/v1` na mesma origem. O access token permanece apenas em memória; a renovação usa cookie `HttpOnly` gerenciado pelo backend.

## Desenvolvimento

```bash
npm ci
npm run dev
```

O proxy do Vite encaminha `/api` para `http://localhost:5000` somente no desenvolvimento.

## Validação

```bash
npm run lint
npm test
npm run coverage
npm run build
npx playwright install chromium
npm run e2e
```

Vitest, Testing Library e axe cobrem componentes e jornadas. Playwright executa smoke tests com dados sintéticos. Os testes automatizados não substituem a validação manual com teclado, leitor de tela, zoom, contraste e diferentes larguras de viewport; portanto, este projeto não declara conformidade WCAG.
