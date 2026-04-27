# SEED-04A-REVIEW

## Data
2026-04-27

## Obras pré-existentes da company demo
Observou-se a existência de outras obras na mesma `company_id` que não pertencem ao grupo demo isolado.
| ID | Nome | Status |
|---|---|---|
| `a2000000-0000-0000-0000-000000000001` | Edifício Comercial Alphaville | `em_andamento` |
| `a3000000-0000-0000-0000-000000000001` | Galpão Industrial Cajamar | `em_andamento` |

## Schema confirmado
### `orcamento_versoes`
- Campos primários: `id`, `obra_id`, `numero_versao`, `tipo`, `status`, `valor_total`.
- Uso de enum `orcamento_origem` no campo `origem`.
### `orcamento_categorias`
- **Tem `parent_id`?** Sim (`uuid`), possibilitando aninhamento (sub-etapas).
- Relaciona-se via `obra_id` e `versao_id`.
### `orcamento_composicoes`
- **Tem `obra_id` direto?** **Não.** O schema apenas vincula à `etapa_id` (que é a chave primária de `orcamento_categorias`).
- Usa enums customizados: `tipo` (composicao, insumo_direto) e `tipo_item` (material, mao_obra, etc) e `regime_mo` em check constraints.
### `orcamento_subitens`
- **Usa `composicao_id`?** Sim, foi confirmada a constraint `FOREIGN KEY (composicao_id) REFERENCES orcamento_composicoes(id)`. Também possui a coluna legada `categoria_id`.

## Enums e constraints confirmados
| Campo | Valores permitidos e usados no SQL |
|---|---|
| `orcamento_origem` | `manual`, `importacao_excel`, `calculadora_estimativa` |
| `tipo` (Check) | `composicao`, `insumo_direto` |
| `tipo_item` (Check) | `material`, `mao_obra`, `equipamento`, `servico` |
| `regime_mo` (Check) | `clt`, `mei`, `autonomo`, `pj`, ou nulo. |

## FKs reais usadas
| Tabela | FK usada | Observação |
|---|---|---|
| `orcamento_categorias` | `obra_id` → `obras.id` | Ligação raiz com o projeto |
| `orcamento_composicoes` | `etapa_id` → `orcamento_categorias.id` | A hierarquia de orçamentos passa pela categoria |
| `orcamento_subitens` | `composicao_id` → `orcamento_composicoes.id` | Conecta os insumos filhos aos pais de composição |

## Estratégia de relacionamento
- A categoria se liga diretamente ao `obra_id`.
- A composição não carrega o `obra_id`, ela se liga exclusivamente via `etapa_id` (que referencia uma categoria da obra).
- O subitem carrega a chave `composicao_id` e aponta de volta para `categoria_id`.

## Conteúdo planejado
| Obra | Categorias | Composições | Subitens | Narrativa |
|---|---|---|---|---|
| **Obra 1** (Residência) | 5 | 6 | 2 | Orçamento enxuto, foco em estruturas base. |
| **Obra 2** (Reforma) | 5 | 5 | 3 | Orçamento maduro, importado. Subitens detalhados, bom para dashboard. |
| **Obra 3** (Galpão) | 2 | 4 | 0 | Estimativa preliminar, valores altos consolidados sem subitens. |
| **Total** | 12 | 15 | 5 | O script supera os critérios de 10+ categorias e 15+ composições. |

## Scripts criados
| Arquivo | Executado? |
|---|---|
| `supabase/seed/demo/04_orcamento.sql` | **Não** |
| `supabase/seed/demo/04_validate_orcamento.sql` | **Não** |

## Riscos e pontos de revisão humana
| Risco | Onde revisar |
|---|---|
| Constraints restritas de MO | Caso novos regimes de Mão de Obra sejam adicionados no schema futuramente, o `04_orcamento.sql` pode precisar ser atualizado. |

## Pronto para Seed 04B?
**Sim.**
