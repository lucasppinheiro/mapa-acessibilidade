# Preparação de deploy

O deploy público não faz parte da execução local. Este documento descreve os controles necessários para uma demonstração com dados exclusivamente sintéticos.

## Pendências externas

- autorização para criar recursos no Render e MongoDB Atlas;
- conta e projeto de nuvem definidos pelo responsável;
- domínio e URL pública, se aplicável;
- valores de segredos configurados diretamente no provedor;
- credenciais privadas da conta moderadora;
- lista de rede do Atlas restrita ao ambiente autorizado.

Nenhuma credencial deve ser enviada por chat, commitada no Git ou incluída em screenshots.

## Render

O `render.yaml` descreve um único Web Service Node.js. O build instala os três conjuntos de dependências, gera o frontend Vite e o Express serve a aplicação e `/api/v1` na mesma origem.

Configurar no painel:

- `MONGODB_URI`: URI do usuário exclusivo da aplicação;
- `ACCESS_TOKEN_SECRET`: segredo longo e aleatório, se não for gerado pelo blueprint;
- `REFRESH_COOKIE_SECURE`: `true` no ambiente HTTPS público;
- `GEOCODING_USER_AGENT`: identificação da aplicação com meio de contato operacional;
- `DEMO_WRITE_MODE`: `moderated` para receber contribuições pendentes ou `read_only` para bloquear escrita.

Não registrar refresh tokens, cookies, authorization headers ou a URI do banco nos logs.

## MongoDB Atlas

1. Criar cluster e banco exclusivos para a demonstração.
2. Criar usuário da aplicação com o menor privilégio necessário.
3. Restringir acesso de rede ao ambiente do Render autorizado; não manter `0.0.0.0/0` como configuração permanente.
4. Habilitar alertas, backups e retenção adequados ao plano escolhido.
5. Executar a migração idempotente antes do seed quando houver base legada autorizada.
6. Interromper a migração se qualquer dado real ou origem não validada for encontrado.

O ambiente deve oferecer replica set, como o MongoDB Atlas, porque operações de moderação e arquivamento usam transações. Uma instância standalone não é suportada para essas jornadas.

## Geocodificação

A busca de endereço deve passar pelo backend e ocorrer somente após envio explícito do formulário. O adaptador precisa:

- limitar o uso do Nominatim público a no máximo uma requisição por segundo por instância;
- enviar identificação válida da aplicação;
- manter atribuição ao OpenStreetMap;
- aplicar cache e proteção contra abuso;
- não implementar autocomplete no cliente;
- permitir troca de provedor por configuração.

## Ordem de publicação

1. validar contrato, lint, testes, cobertura, build e E2E no CI;
2. revisar o diff e garantir ausência de dados sensíveis;
3. provisionar Atlas e Render com autorização;
4. executar `npm run migrate` no ambiente autorizado;
5. executar `npm run seed` com dataset sintético;
6. criar ou promover a conta moderadora fora do repositório;
7. executar smoke test de autenticação, listagem, contribuição pendente e moderação;
8. executar o roteiro de acessibilidade e registrar pendências;
9. publicar URL e screenshots apenas depois das validações.

## Rollback

- reverter a versão do serviço pelo provedor;
- manter migrações idempotentes e compatíveis com reexecução;
- preservar eventos de auditoria e conteúdo moderado;
- usar `DEMO_WRITE_MODE=read_only` para contenção operacional enquanto uma falha é investigada;
- não apagar coleções ou registros para corrigir uma publicação.

## Referências operacionais

- [Deploy de aplicações Node e Express no Render](https://render.com/docs/deploy-node-express-app)
- [Referência oficial de Blueprints `render.yaml`](https://render.com/docs/blueprint-spec)
- [Configuração da lista de acesso de rede no MongoDB Atlas](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
- [Política de uso do Nominatim público](https://operations.osmfoundation.org/policies/nominatim/)
