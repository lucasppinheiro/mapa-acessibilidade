# Roteiro de validação de acessibilidade

## Objetivo e limite

Este roteiro registra a validação do **alvo WCAG 2.2 AA** do AcessaMapa. Ele não é uma declaração de conformidade. Uma execução só pode ser marcada como concluída quando houver evidência reproduzível dos testes automatizados e manuais descritos aqui.

Não inclua nomes, e-mails, credenciais, gravações de pessoas reais ou dados de clientes nas evidências. Use exclusivamente as contas e os locais sintéticos do seed.

## Metadados da execução

| Campo | Valor |
| --- | --- |
| Versão ou commit | Pendente |
| Ambiente e URL | Pendente |
| Data | Pendente |
| Responsável | Pendente |
| Navegador e versão | Pendente |
| Sistema operacional | Pendente |
| Leitor de tela e versão | Pendente |
| Dataset sintético | Pendente |

## Escopo mínimo

Validar as rotas e estados abaixo:

- página inicial em lista e mapa;
- filtros, busca e paginação de locais;
- cadastro e login;
- cadastro de local com busca de endereço, coordenadas manuais e geolocalização negada;
- detalhe de local sem avaliação e com avaliações aprovadas;
- criação de avaliação;
- página de privacidade e exclusão de conta;
- fila e decisão de moderação com papel autorizado;
- erros 400, 401, 403, 404, 409, 422, 429 e falha de rede.

## Verificações automatizadas

Execute em uma árvore limpa e registre apenas o resumo do resultado:

```bash
npm run lint
npm test
npm run coverage
npm run build
npm run e2e
```

Critérios:

- zero violações axe classificadas como críticas ou sérias nas rotas principais;
- 80% ou mais de linhas e funções, e 75% ou mais de branches;
- lint e build sem erro;
- nenhuma falha nos cenários de teclado e geolocalização negada do Playwright.

Ferramentas automatizadas encontram apenas parte das barreiras. Um resultado sem violações não encerra a validação.

## Teste somente com teclado

Execute todas as jornadas sem mouse ou tela sensível ao toque.

1. Recarregue a página e use `Tab` até revelar e acionar o link “Pular para o conteúdo”.
2. Confirme que o foco chega ao conteúdo principal e permanece visível.
3. Percorra cabeçalho, menu responsivo, filtros, lista, alternância lista/mapa e paginação.
4. Confirme que a ordem de foco acompanha a ordem visual e não entra em áreas ocultas.
5. Abra e feche menus e diálogos com teclado; confirme retorno do foco ao acionador.
6. Cadastre um local usando primeiro a busca explícita de endereço e depois latitude/longitude manuais.
7. Selecione resultados de endereço, recursos tri-state e nota da avaliação com controles nativos.
8. Provoque erros de validação; confirme foco no primeiro erro e acesso ao resumo e aos erros inline.
9. Negue a geolocalização; confirme que coordenadas manuais e busca de endereço continuam disponíveis.
10. Confirme que nenhum componente prende o foco e que `Esc` fecha apenas componentes que documentam esse comportamento.

Resultado: **Pendente**.

## Teste com NVDA

Configuração recomendada: NVDA estável mais recente e Firefox ou Chrome estável no Windows.

1. Navegue por regiões e confirme cabeçalho, navegação, conteúdo principal e rodapé.
2. Liste headings e confirme um `h1` por rota e hierarquia sem saltos semânticos indevidos.
3. Navegue por links, botões, campos e landmarks; confirme nomes específicos e estados anunciados.
4. Confirme `aria-current` na rota ativa e título de documento atualizado após navegação SPA.
5. Na lista, ouça nome, categoria, endereço, estado de avaliação e recursos de cada local.
6. No mapa, confirme que a interface não usa `role="application"` e que os marcadores têm nomes específicos.
7. Compare lista e mapa: toda informação e ação relevante do mapa deve existir na experiência textual.
8. Confirme anúncios de carregamento, sucesso e erro sem repetição excessiva.
9. Nos formulários, confirme label, obrigatoriedade, ajuda, valor, estado inválido e mensagem de erro.
10. No rating, confirme grupo, opções de 1 a 5 e opção selecionada.

Resultado: **Pendente**.

## Zoom, refluxo e tamanho de tela

1. Em viewport de 1280 CSS px, aplique zoom de 200% e depois 400%.
2. Emule largura de 320 CSS px sem reduzir o zoom.
3. Confirme ausência de rolagem horizontal para leitura, exceto em conteúdo bidimensional essencial.
4. Confirme que lista, filtros, formulários, mensagens e ações não se sobrepõem nem são cortados.
5. Confirme que a lista é a visualização inicial no celular e continua disponível em qualquer largura.
6. Aumente apenas o espaçamento de texto conforme WCAG 1.4.12 e confirme que conteúdo e controles permanecem operáveis.

Resultado: **Pendente**.

## Contraste e percepção de estados

Meça combinações reais com uma ferramenta de contraste e registre os pares verificados.

- texto normal: mínimo 4,5:1;
- texto grande: mínimo 3:1;
- componentes, limites necessários e indicador de foco: mínimo 3:1 contra cores adjacentes;
- hover, foco, seleção, presente, ausente, desconhecido, pendente, aprovado e rejeitado não dependem apenas de cor;
- texto sobre mapa e imagens mantém contraste com fundo variável.

Resultado: **Pendente**.

## Alto contraste, movimento e preferências

1. Ative o modo de alto contraste do Windows e confirme foco, bordas, ícones, checkboxes, radios e alternância lista/mapa.
2. Confirme que estados continuam identificáveis com `forced-colors: active`.
3. Ative redução de movimento e confirme ausência de animações não essenciais ou transições desconfortáveis.
4. Confirme que conteúdo não pisca acima dos limites de segurança.

Resultado: **Pendente**.

## Geolocalização e permissões

- Nenhuma permissão é solicitada ao carregar a página.
- O botão explica finalidade e consequência antes de chamar a API do navegador.
- Negar, ignorar ou indisponibilizar a permissão produz mensagem clara e não bloqueia a jornada.
- A localização não é persistida além do necessário para preencher as coordenadas escolhidas pelo usuário.

Resultado: **Pendente**.

## Matriz de resultados

| ID | Jornada | Automático | Teclado | NVDA | 400% / 320 px | Contraste | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A11Y-01 | Consultar e filtrar locais | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| A11Y-02 | Alternar lista e mapa | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| A11Y-03 | Registrar e autenticar | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| A11Y-04 | Cadastrar local | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| A11Y-05 | Consultar e avaliar local | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| A11Y-06 | Moderar contribuição | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| A11Y-07 | Privacidade e exclusão | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |

## Registro de achados

Use um item por barreira:

```text
ID:
Rota e estado:
Critério WCAG relacionado:
Severidade: crítica | séria | moderada | menor
Passos para reproduzir:
Resultado atual:
Resultado esperado:
Tecnologia assistiva e navegador:
Evidência sintética:
Correção:
Reteste:
```

Priorize bloqueios completos de jornada, ausência de nome/papel/valor, foco perdido, contraste insuficiente e conteúdo indisponível sem o mapa. Um achado só deve ser encerrado após reteste no mesmo cenário e em um cenário adjacente para verificar regressão.

## Encerramento

Somente após todos os itens críticos e sérios serem corrigidos e a matriz estar concluída é possível preparar uma avaliação de conformidade. A decisão de publicar uma alegação formal permanece pendente de revisão humana do escopo, das evidências e das exceções registradas.
