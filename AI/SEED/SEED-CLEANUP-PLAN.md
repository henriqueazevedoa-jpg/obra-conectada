# Plano de Limpeza Segura (Seed Demo)

## Estratégia
Limpeza bottom-up (das tabelas mais isoladas para as tabelas raiz) por IDs fixos das obras demo, visando evitar problemas com Foreign Keys configuradas com `NO ACTION` ou `RESTRICT`. 
Não efetuamos `DELETE` amplo por `company_id`, mantendo as configurações em nível de empresa.

## IDs fixos usados
```
company_id: bbbbbbbb-0000-0000-0000-000000000001
obras:
  a1000000-0000-0000-0000-000000000001
  a2000000-0000-0000-0000-000000000002
  a3000000-0000-0000-0000-000000000003
```

## Ordem bottom-up proposta
1. **Grupo 1: Intelligence** (`processamento_custos`, `projeto_quantitativos`, `projeto_chunks`, `projeto_paginas_raw`, `projeto_arquivos`)
2. **Grupo 2: Diário, Documentos e Agenda** (`diario_fotos`, `diario_materiais`, `diario_servicos`, `entradas_pendentes`, `diario_registros`, `equipe_documentos`, `equipe_colaboradores`, `doc_resultados`, `doc_recebimentos`, `doc_uploads`, `documentos_obra`, `obra_calendarios_holidays`, `obra_calendarios`, `obra_agenda`, `chat_sessions`)
3. **Grupo 3: Financeiro e Contratos** (`custo_real_itens`, `pagamento_anexos`, `pagamento_itens`, `pagamentos`, `recebiveis`, `contratos_medicao_itens`, `contratos_medicoes`, `contratos_aditivos`, `contratos_escopo`, `cronograma_marcos`, `contratos`)
4. **Grupo 4: Suprimentos e Cotações** (`cotacao_respostas`, `cotacao_lote_itens`, `cotacao_lotes`, `cotacao_fornecedor_listas`, `cotacao_listas`, `cotacao_precos`, `cotacao_precos_manuais`, `cotacao_links`, `lista_compra_itens`, `lista_compra`, `material_recebimentos`, `material_pedidos`, `insumos_pendentes_cotacao`, `movimentacoes`, `materiais`)
5. **Grupo 5: Cronograma** (`cronograma_medicao_itens`, `cronograma_medicoes`, `cronograma_historico`, `cronograma_alocacoes`, `cronograma_impedimentos`, `cronograma_dependencias`, `cronograma_tarefas`, `cronograma_versoes`)
6. **Grupo 6: Orçamento** (`orcamento_subitens`, `orcamento_composicoes`, `orcamento_etapa_dependencias`, `orcamento_categorias`, `orcamento_versoes`, `calculadora_estimativas`)
7. **Grupo 7: Base de Obra** (`checagem_material`, `precos_fornecedores`, `preco_historico`, `fornecedores`, `recursos_obra`, `obra_links`, `notifications`, `push_notifications_log`, `obra_memberships`)
8. **Grupo Raiz: Obras** (`obras`)

## Tabelas com obra_id direto
**Quantidade:** 54 tabelas identificadas (ex: `contratos`, `cronograma_tarefas`, `doc_uploads`, `orcamento_categorias`, etc).
**Estratégia:** `DELETE FROM tabela WHERE obra_id IN ('a1...', 'a2...', 'a3...');`

## Tabelas com company_id direto (sem obra_id)
**Quantidade:** 68 tabelas (a grande maioria são tabelas de base, ex: `amdahl_grupos`, `company_addons`, `user_roles`).
**Estratégia:** Ignoradas no DELETE explícito, a não ser que representem relações filhas de tabelas que estão sendo deletadas. As tabelas exclusivas da company não são apagadas no script da obra.

## Tabelas com relação indireta
**Quantidade:** 15 tabelas (ex: `orcamento_subitens`, `diario_fotos`, `contratos_aditivos`).
**Estratégia:** Subqueries baseadas no respectivo parent (ex: `DELETE FROM orcamento_subitens WHERE categoria_id IN (SELECT id FROM orcamento_categorias WHERE obra_id IN (...));`).

## Tabelas com ON DELETE CASCADE confirmado
**Quantidade:** 111 relacionamentos Foreign Key mapeados como `CASCADE`. Apesar do mapeamento exaustivo, manteremos o DELETE explícito de baixo para cima como dupla segurança.

## Tabelas de Storage (pendência — sprint separada)
A exclusão via banco não deleta os objetos subjacentes no bucket Storage. Isso deve ser feito via API ou Edge Function.
| Tabela | Coluna | Motivo do adiamento |
|---|---|---|
| `diario_fotos` | `storage_path` | Requer chamada à API do Storage |
| `doc_uploads` | `storage_path` | Requer chamada à API do Storage |
| `equipe_documentos` | `arquivo_url` | Requer chamada à API do Storage |
| `pagamento_anexos` | `file_path` | Requer chamada à API do Storage |
| `projeto_arquivos` | `storage_path` | Requer chamada à API do Storage |

## Comportamento de triggers em DELETE
- **`on_obra_created`:** O trigger em `obras` tem `action_timing = AFTER` e `event_manipulation = INSERT`. **Confirmado**: não dispara em DELETE.
- **`updated_at`:** Triggers `BEFORE UPDATE` — não afetam deleção.

## Tabelas ignoradas nesta fase
| Tabela | Motivo |
|---|---|
| `auth.users` | IDs fixos não são recriados, e geridos pelo Identity do Supabase. |
| `companies` | Configurações globais da conta. |
| `profiles` | Contas de usuário não devem ser apagadas, apenas seus vínculos às obras. |
| `amdahl_grupos`, `chat_preferences` | Não têm amarração com `obra_id`, afetam toda a conta. |

## Riscos e Mitigações
| Risco | Mitigação |
|---|---|
| **1. Deleção ampla indesejada.** | Todos os scripts possuem hardcode dos UUIDs das 3 obras demo. O `company_id` só é usado combinando com UUIDs das categorias das obras. |
| **2. Restrições de FK (NO ACTION).** | A sequência definida no script e no plano usa a abordagem Top-Down na criação e Bottom-Up na deleção. |
| **3. Arquivos órfãos no Storage.** | O mapeamento explícito serve para que a Sprint do Storage limpe os buckets correspondentes às urls/paths antes de apagar a linha. |
| **4. Inconsistência devido a concorrência.** | O script utiliza transação SQL completa `BEGIN;` e `COMMIT;`. Se um falhar, tudo volta (Rollback). |
| **5. Triggers de deleção ocultos.** | O mapeamento explícito do trigger de `obras` descarta impacto do trigger de inteligência e setup. |

## Confirmação e Relatório Git
- **Zero DELETEs executados:** Confirmado.
- **Zero Storage alterado:** Confirmado.

`git status --short`:
```
 M .env.example
 M AI/AUDITS/SPRINT-76A4-GIT-FINAL.md
 M PLANO_GERAL_STATUS.md
 M PROJECT-MEMORY.md
 M package-lock.json
 M package.json
 M src/components/cronograma/GanttCanvasPanel.tsx
?? AI/AUDITS/SPRINT-76A3-GIT-CLEANUP.md
?? AI/SEED/
?? checklist-sprint-63.txt
?? checklist-sprint-64.txt
?? logo/image.svg
?? public/icons/
?? supabase/seed/
```

## Próximo passo
Revisar `02_validate_cleanup_targets.sql` e as contagens esperadas.
Aprovação humana antes de executar `02_clean_demo_data.sql` na Sprint Seed 02B.
