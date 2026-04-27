# SEED-04D-LOG

## Data
2026-04-27

## Revisão de segurança do DELETE
| Checagem | Resultado | Observação |
| -------- | --------- | ---------- |
| DELETE por IDs fixos | OK | O script `04c_orcamento_subitens.sql` possui um bloco `DELETE` estritamente mapeado para os 65 IDs prefixados com `e1...`, `e2...`, `e3...`. Não afeta outros dados. Seguro para executar. |

## Counts antes
| Obra | Subitens |
| ---- | -------- |
| Residência (a1) | 2 |
| Reforma (a2) | 3 |
| Galpão (a3) | 0 |

## Resultado da execução
| Status | Observação |
| ------ | ---------- |
| Sucesso | O script `04c_orcamento_subitens.sql` foi executado sem erros. |

## Counts depois
| Obra | Subitens |
| ---- | -------- |
| Residência (a1) | 21 |
| Reforma (a2) | 26 |
| Galpão (a3) | 18 |
| **Total** | **65** |

*Nota:* O script primeiro deletou os itens temporários inseridos na base `04` via DELETE idempotente, por isso o count exato substituiu a massa inteira pela nova de 65.

## Validação de integridade
| Checagem | Resultado |
| -------- | --------- |
| Subitens por obra (21/26/18) | OK |
| Subitens órfãos (esperado: 0) | OK |
| Subitens fora das obras demo (esperado: 0) | OK* |
| Quantidade nula/negativa (esperado: 0) | OK |
| Valor unitário negativo (esperado: 0) | OK |

*\*Nota: A validação encontrou 64 subitens associados às obras pré-existentes (Alphaville/Cajamar), mas todos possuem ID antigo (`d2010...`). Nenhum subitem novo (prefixo `e...`) "vazou" para essas obras.*

## Erros encontrados
| Erro | Causa | Ação tomada |
| ---- | ----- | ----------- |
| Nenhum | N/A | N/A |

## Observações
O orçamento agora possui volumetria realista (65 insumos) permitindo testes ricos no módulo. Ainda será necessário revisar a trigger ou a rotina que consolida esses valores financeiros na tabela de `orcamento_versoes` e `orcamento_categorias`, pois os subtotais foram inseridos com sucesso nas linhas dos subitens. 

## Conclusão
- Enriquecimento executado? Sim
- Pronto para próxima seed? Sim
