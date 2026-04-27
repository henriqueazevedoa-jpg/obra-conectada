# SEED-CLEANUP-REVIEW

## Data
27 de Abril de 2026

## Revisor: Antigravity Sprint 02A.1

## DELETEs aprovados
| # | Tabela | Filtro usado | FK confirmada? |
|---|---|---|---|
| 1-5 | Intelligence (5 tabelas) | `obra_id` (via subquery em `projeto_arquivos` ou direto) | Sim |
| 6-15 | Diário, Documentos, Agenda (10 tabelas) | `obra_id` direto ou via `diario_registros`, `equipe_colaboradores` | Sim |
| 16-26 | Financeiro e Contratos (11 tabelas) | `obra_id` direto ou subqueries via `pagamentos`/`contratos` | Sim |
| 27-41 | Suprimentos e Cotações (15 tabelas) | `obra_id` direto ou subqueries limitadas à obra | Sim |
| 42-49 | Cronograma (8 tabelas) | `obra_id` direto ou subqueries via `cronograma_tarefas` | Sim |
| 50-55 | Orçamento (6 tabelas) | `obra_id` direto ou subqueries revisadas (`orcamento_composicoes`, `orcamento_categorias`) | Sim (1 correção aplicada) |
| 56-64 | Base de Obra (9 tabelas) | `obra_id` direto (`fornecedores`, `precos_fornecedores`, etc.) | Sim |
| 65 | Obras | `id` in (Obras Demo) | Sim |

*Todos os 65 comandos de DELETE presentes no script `02_clean_demo_data.sql` foram revisados. Não há tabelas órfãs ou filtros exclusivamente globais (`company_id`).*

## DELETEs suspeitos (requerem ajuste)
| # | Tabela | Problema | Correção sugerida |
|---|---|---|---|
| N/A | (Resolvido) | `orcamento_subitens` estava usando `categoria_id` com base em `company_id`. | Alterado para usar `composicao_id` via subquery em cascata. |

## DELETEs bloqueados (não executar)
| # | Tabela | Motivo |
|---|---|---|
| N/A | Nenhuma | Todas as tabelas que estão no script atual foram confirmadas como pertencentes/dependentes de `obra_id`. |

## Verificações de FKs reais
### orcamento_subitens
- **Coluna real:** Ambas `categoria_id` e `composicao_id` estão presentes e são UUIDs.
- **Script usa coluna correta?** Não usava a mais segura (usava `categoria_id`).
- **Correção aplicada?** Sim. O script agora aponta para `composicao_id IN (SELECT id FROM orcamento_composicoes...)`.

### preco_historico
- **Tem obra_id?** Sim. Verificado no schema.
- **Decisão:** Deletar (mantido no script com filtro direto `WHERE obra_id IN (...)`).

### Tabelas globais verificadas
| Tabela | Tem obra_id? | Decisão |
|---|---|---|
| `fornecedores` | Sim | Deletar |
| `precos_fornecedores` | Sim | Deletar |
| `preco_historico` | Sim | Deletar |
| `notifications` | Sim | Deletar |
| `push_notifications_log`| Sim | Deletar |
| `chat_sessions` | Sim | Deletar |

*(Nota: como essas tabelas possuem `obra_id`, não são puramente globais e seus dados locais à obra devem ser expurgados).*

## Correções aplicadas
| Arquivo | Linha/trecho | Alteração |
|---|---|---|
| `02_clean_demo_data.sql` | 67 | `WHERE categoria_id IN...` alterado para `WHERE composicao_id IN (SELECT id FROM orcamento_composicoes WHERE etapa_id IN (SELECT id FROM orcamento_categorias WHERE obra_id IN (...)))` |
| `02_validate_cleanup_targets.sql` | 77 | Atualizada mesma lógica da cláusula WHERE para espelhar o script de limpeza com exatidão. |

## Status final
- **02_validate_cleanup_targets.sql:** aprovado
- **02_clean_demo_data.sql:** aprovado
- **Pronto para Sprint 02B?** sim — Todos os DELETEs dependem estritamente das três obras de demonstração e as FKs ambíguas ou faltantes foram verificadas no banco real.

## Arquivos alterados nesta sprint
- `supabase/seed/demo/02_clean_demo_data.sql` (Correção da FK)
- `supabase/seed/demo/02_validate_cleanup_targets.sql` (Correção da FK)
- `AI/SEED/SEED-CLEANUP-REVIEW.md` (Este relatório gerado agora)
