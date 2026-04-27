# SEED-04E-TOTALIZERS-AUDIT

## Data
2026-04-27

## Resumo executivo
- Total financeiro calculado pelos subitens:
  - Residência: R$ 100.000,00
  - Reforma: R$ 55.000,00
  - Galpão: R$ 350.000,00
- Total salvo em composições (`preco_total`): **Coerente** com os subitens (100% exato).
- Total salvo em categorias (`preco_total`): **Coerente** com as composições/subitens (100% exato).
- Total salvo em versões (`valor_total`): **Divergente** para as obras a1 (Residência) e a2 (Reforma).
- Divergência encontrada? **Sim**

## Campos financeiros encontrados
| Tabela | Campos | Observação |
| ------ | ------ | ---------- |
| `orcamento_composicoes` | `preco_total`, `preco_unitario` | A tabela principal utiliza `preco_total` do tipo `numeric`. |
| `orcamento_categorias` | `preco_total`, `estimado_valor` | A tabela utiliza `preco_total` para o budget fechado do tipo `numeric`. |
| `orcamento_versoes` | `valor_total` | É a única tabela que divergiu no naming, utilizando `valor_total` (`numeric`). |

## Resultado por obra
| Obra | Soma subitens | Total composições | Total categorias | Total versão | Divergência |
| ---- | ------------- | ----------------- | ---------------- | ------------ | ----------- |
| a1 (Residência) | R$ 100.000,00 | R$ 100.000,00 | R$ 100.000,00 | R$ 150.000,00 | Versão R$ 50.000,00 acima |
| a2 (Reforma) | R$ 55.000,00 | R$ 55.000,00 | R$ 55.000,00 | R$ 85.000,00 | Versão R$ 30.000,00 acima |
| a3 (Galpão) | R$ 350.000,00 | R$ 350.000,00 | R$ 350.000,00 | R$ 350.000,00 | Nenhuma |

## Divergências por composição
| Composição | Soma subitens | Total salvo | Diferença |
| ---------- | ------------- | ----------- | --------- |
| Todas | Coerentes | Coerentes | R$ 0,00 |

## Divergências por categoria
| Categoria | Soma composições | Total salvo | Diferença |
| --------- | ---------------- | ----------- | --------- |
| Todas | Coerentes | Coerentes | R$ 0,00 |

## Como o frontend busca os totais
| Tela | Arquivo | Campo/Source | Risco |
| ---- | ------- | ------------ | ----- |
| Dashboards | `GestorDashboard.tsx` | Soma de `orcamento_categorias.preco_total` | Baixo (Valores das categorias estão corretos) |
| Cronograma | `TaskDetailDrawer.tsx` | Lê de `categoria.preco_total` / `composicao.preco_total` | Baixo (Valores corretos e coerentes) |
| Orçamento Base | `OrcamentoContext.tsx` | Utiliza os campos fixos `preco_total` (cats/comps) e `valor_total` (versão) e tem métodos `update` para consolidar e salvar em banco. | Médio (o `valor_total` da versão ficará esquisito na listagem de versões se diferir do dashboard) |

## Triggers/rotinas de consolidação encontradas
- **Nenhuma trigger encontrada.**
- O backend de banco de dados não recalcula os orçamentos automaticamente.
- Toda consolidação e propagação de valores (Subitem → Composição → Categoria → Versão) é feita puramente **no frontend** via `OrcamentoContext.tsx` e gravada fisicamente nestas tabelas através de dezenas de mutations assíncronas do Supabase (`await supabase.from(...).update(...)`).

## Conclusão
- Totalizadores coerentes? **Parcial.** Subitens, Composições e Categorias estão 100% perfeitamente alinhados e consistentes (graças aos dados milimetricamente fornecidos na seed anterior). Apenas `orcamento_versoes.valor_total` está incorreto nas obras a1 e a2 devido aos `INSERT` originais do arquivo `04_orcamento.sql`.
- Frontend usa campos atualizados? **Sim**, ele puxa a versão persistida em banco nos campos, não calculando de forma relacional via query no backend.
- Precisa de sprint de correção antes dos pagamentos? **Sim**. Se formos usar a versão como base de faturamento ou comparação financeira, os R$ 50k fantasma na obra a1 causarão inconsistência na UI. 
- Correção recomendada: Realizar um script super rápido (`04f_fix_orcamento_versoes.sql`) apenas com 2 cláusulas `UPDATE orcamento_versoes SET valor_total = ... WHERE obra_id = ...` para igualar a a1 para 100.000,00 e a2 para 55.000,00. Nenhuma alteração nas tabelas filhas será necessária.
