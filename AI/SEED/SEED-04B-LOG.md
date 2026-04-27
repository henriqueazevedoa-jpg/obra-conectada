# SEED-04B-LOG

## Data
2026-04-27

## Scripts executados
| Script | Executado? | Resultado |
| ------ | ---------- | --------- |
| 04_validate_orcamento.sql (antes) | Sim | 0 dados demo encontrados |
| 04_orcamento.sql | Sim | Erros corrigidos (UUID e Typo), depois Sucesso |
| 04_validate_orcamento.sql (depois) | Sim | Massas validadas conforme o esperado |

## Counts antes
| Métrica | Resultado |
| ------- | --------- |
| Versões por obra | 0 |
| Categorias por obra | 0 |
| Composições | 0 |
| Subitens | 0 |
| Registros nas obras pré-existentes | 16 categorias já existiam |

## Resultado da execução
| Status | Observação |
| ------ | ---------- |
| Sucesso com correções | Ocorreram 3 erros documentados que foram corrigidos antes do sucesso final. |

## Counts depois
| Métrica | Resultado |
| ------- | --------- |
| Versões por obra | a1: 1, a2: 1, a3: 1 |
| Categorias por obra | a1: 5, a2: 5, a3: 2 |
| Composições | a1: 6, a2: 5, a3: 4 |
| Subitens | a1: 2, a2: 3, a3: 0 |
| Registros nas obras pré-existentes | 16 (mantido igual) |

## Validação de integridade
| Checagem | Resultado |
| -------- | --------- |
| Versões por obra (esperado: 1 cada) | OK |
| Categorias por obra | OK |
| Composições via etapa_id | OK |
| Subitens via composicao_id | OK |
| Composições órfãs (esperado: 0) | OK |
| Subitens órfãos (esperado: 0) | OK |
| Dados criados nas obras pré-existentes (esperado: 0) | OK |

## Erros encontrados
| Erro | Causa | Ação tomada |
| ---- | ----- | ----------- |
| `invalid input syntax for type uuid` | IDs gerados na Sprint 04A continham letras não-hexadecimais (`v`, `p`, `s`). | IDs substituídos por letras hexadecimais válidas (`f`, `d`, `e`). |
| `violates check constraint "orcamento_versoes_tipo_check"` | A versão da Obra 2 usava tipo `fechado`, mas o enum da tabela não permite. | Alterado para `analitico`. |
| `Atenção: Número de composições criadas (14), esperado mínimo 15` no bloco de checagem. | A categoria c2300000 estava vinculada à obra pré-existente (`a2...1`) em vez da demo (`a2...2`). | Corrigido o `obra_id` na categoria para terminar em `2`. |

## Observações
- O orçamento ficou extremamente enxuto (apenas 5 subitens no total) e nenhuma medição de orçamento foi inserida ainda.
- Recomendação para Seed 04C: expandir a volumetria de composições e insumos para melhorar os relatórios e dashboards.

## Conclusão
- Orçamento base executado? Sim
- Pronto para Seed 04C (enriquecimento)? Sim
