# Deploy e operação da demonstração

A demonstração pública está disponível em [acessamapa.onrender.com](https://acessamapa.onrender.com). O ambiente usa somente dados sintéticos e mantém novas contribuições em moderação.

## Arquitetura publicada

- Um Web Service Node.js no Render executa o backend e serve o frontend compilado.
- A API responde em `/api/v1` na mesma origem da interface.
- O MongoDB Atlas mantém os dados da demonstração em um banco separado.
- O endpoint `/api/v1/health/ready` só responde como pronto quando a conexão com o banco está disponível.
- O Render inicia novos deploys após a aprovação dos checks da branch `main`.

O arquivo [render.yaml](../render.yaml) descreve o serviço, o comando de build, o comando de inicialização e as variáveis necessárias.

## Variáveis do Render

Configure os valores sensíveis somente no painel do provedor:

| Variável | Uso |
| --- | --- |
| `MONGODB_URI` | URI do usuário exclusivo da aplicação no Atlas. |
| `ACCESS_TOKEN_SECRET` | Segredo longo e aleatório para os access tokens. |
| `REFRESH_COOKIE_SECURE` | Deve permanecer como `true` no ambiente HTTPS. |
| `GEOCODING_USER_AGENT` | Identificação da aplicação para o provedor de geocodificação. |
| `DEMO_WRITE_MODE` | `moderated` recebe contribuições pendentes; `read_only` bloqueia novas escritas. |

Não registre URI do banco, tokens, cookies, senhas ou cabeçalhos de autorização nos logs. Esses valores também não devem aparecer em commits, issues ou capturas de tela.

## MongoDB Atlas

O ambiente deve usar um replica set, como o oferecido pelo Atlas, porque os fluxos de moderação e arquivamento usam transações.

Controles esperados:

1. banco separado para a demonstração;
2. usuário exclusivo da aplicação com o menor privilégio necessário;
3. lista de acesso de rede limitada à infraestrutura autorizada;
4. credenciais armazenadas somente como segredo do Render;
5. dataset sintético carregado pelo seed idempotente;
6. conta moderadora mantida fora do repositório.

Se a URI ou a senha do banco for alterada, atualize `MONGODB_URI` no Render e execute um novo deploy. Uma falha `bad auth` indica credencial inválida; uma falha `querySrv` aponta para resolução DNS ou endereço incorreto do cluster.

## Geocodificação

A busca de endereço passa pelo backend e só ocorre após o envio explícito do formulário. O adaptador:

- limita chamadas ao Nominatim público;
- envia a identificação configurada em `GEOCODING_USER_AGENT`;
- mantém a atribuição ao OpenStreetMap;
- usa cache para reduzir chamadas repetidas;
- não implementa autocomplete;
- permite trocar o provedor por variável de ambiente.

## Publicação e verificação

Antes de promover uma mudança para `main`:

1. revisar o diff e confirmar que não há credenciais ou dados reais;
2. executar lint, testes, cobertura, validação OpenAPI e build;
3. aguardar os testes E2E e as verificações automatizadas de acessibilidade;
4. confirmar o deploy no Render;
5. verificar `/api/v1/health/live` e `/api/v1/health/ready`;
6. executar um smoke test usando apenas os dados sintéticos.

O seed pode ser executado com:

```bash
npm run seed
```

Em uma base legada autorizada, execute a migração idempotente antes do seed:

```bash
npm run migrate
```

Não execute migração se houver qualquer indício de dados reais ou origem não validada.

## Contenção e rollback

- Alterar `DEMO_WRITE_MODE` para `read_only` bloqueia novas escritas durante uma investigação.
- O Render permite retornar a uma versão anterior do serviço.
- Migrações devem continuar idempotentes e seguras para reexecução.
- Eventos de auditoria e conteúdo moderado devem ser preservados.
- Coleções não devem ser apagadas como forma de corrigir uma publicação.

## Referências

- [Deploy de aplicações Node e Express no Render](https://render.com/docs/deploy-node-express-app)
- [Referência de Blueprints do Render](https://render.com/docs/blueprint-spec)
- [Lista de acesso de rede do MongoDB Atlas](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
- [Política de uso do Nominatim público](https://operations.osmfoundation.org/policies/nominatim/)
