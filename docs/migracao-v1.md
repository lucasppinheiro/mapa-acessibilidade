# Migração de dados para a v1

O script `npm run migrate` converte documentos legados para o modelo da v1. Ele deve ser idempotente: reexecutar a mesma versão não pode criar duplicidades nem alterar novamente documentos já convertidos.

## Regra de interrupção

Não execute a migração em um banco externo até confirmar a origem e a natureza dos dados. Se houver qualquer dado real de cliente, evidência bruta, credencial ou informação pessoal sem governança definida, interrompa o procedimento e marque a execução como pendente de validação.

## Transformações

| Origem | Destino |
| --- | --- |
| recurso `true` | `presente` |
| recurso `false` ou ausente | `desconhecido` |
| status `ativo` | `aprovado` |
| status `pendente` | `pendente` |
| status `inativo` | `arquivado` |
| coordenadas `{ lat, lng }` | GeoJSON `Point` com `[lng, lat]` |
| média fixa ou legada | média recalculada apenas com avaliações aprovadas |
| nenhum item aprovado | média `null` |
| `tipoDeficiencia` | campo removido |
| `tokenVersion` | campo removido |

O e-mail continua existindo apenas na conta privada necessária à autenticação e nunca deve ser copiado para DTOs, contribuições, avaliações ou eventos públicos.

## Procedimento controlado

1. confirmar que a URI aponta para o ambiente correto e autorizado;
2. confirmar que o MongoDB opera como replica set e obter snapshot ou backup recuperável conforme a capacidade do ambiente;
3. registrar a versão da aplicação e a contagem inicial de usuários, locais e avaliações, sem exportar o conteúdo;
4. executar `npm run migrate` uma vez;
5. executar novamente para comprovar idempotência;
6. verificar índices, especialmente `2dsphere` em `localizacao`;
7. comparar contagens e validar amostras exclusivamente sintéticas;
8. recalcular e conferir médias nulas e avaliações aprovadas;
9. registrar somente totais, resultado e request ou job ID não sensível.

## Critérios de aceite

- nenhum documento mantém `tipoDeficiencia` ou `tokenVersion`;
- todas as coordenadas válidas seguem GeoJSON e ordem longitude/latitude;
- estados de recursos pertencem ao enum tri-state;
- estados de moderação pertencem ao enum da v1;
- locais sem avaliações aprovadas têm média `null` e total zero;
- nenhuma resposta pública passa a expor e-mail ou campo interno;
- a segunda execução não produz nova alteração material.

Qualquer documento inválido deve ser reportado sem incluir seu conteúdo sensível. Não apague registros para “limpar” a migração; preserve histórico e trate exceções com uma correção idempotente revisada.
