# SEED-03-LOG

## Data
2026-04-27

## Enums confirmados (obra_status, role, etc.)
- `obra_status` (valores esperados no campo text): `planejamento`, `em_andamento`, `concluida`, `pausada`
- `tipo_implantacao`: `nova`, `em_andamento`
- `origem_dados`: `real`, `estimado`, `importado`, `verbal`, `pendente_validacao`
- `app_role`: `gestor`, `funcionario`, `cliente`, `admin`, `engenheiro`

## Campos usados em companies, profiles, obras
- `companies`: `id`, `nome`, `status`, `created_at`, `updated_at`
- `profiles`: `user_id`, `nome`, `email`, `company_id`, `created_at`, `profissao`
- `obras`: `id`, `company_id`, `nome`, `status`, `percentual_andamento`, `cliente`, `is_demo`, `tipo_implantacao`, `origem_dados`

## Constraint de obra_memberships (qual ON CONFLICT foi usado?)
- A constraint identificada na tabela foi `UNIQUE (obra_id, user_id)` (constraints `obra_memberships_obra_id_user_id_key` e `obra_memberships_obra_user_unique`).
- O `ON CONFLICT` utilizado foi explícito nas chaves: `ON CONFLICT (obra_id, user_id) DO UPDATE SET role = EXCLUDED.role;`.

## Efeitos colaterais da trigger on_obra_created
| Tabela | Antes | Depois | Diferença |
|---|---|---|---|
| `obras` | 2 | 5 | +3 |
| `obra_memberships` | 0 | 3 | +3 |
| `orcamento_categorias` | 0 | 0 | 0 |
| `cronograma_tarefas` | 0 | 0 | 0 |
*Nota: A trigger não disparou a criação de módulos base em tabelas de negócio (categorias, tarefas, calendários, notificações). Sem impacto limitante para o Seed.*

## Registros inseridos
| Tabela | Count |
|---|---|
| `companies` | 1 (Atualizado via UPSERT) |
| `profiles` | 1 (Atualizado via UPSERT - ON CONFLICT user_id) |
| `obras` | 3 (Inseridos) |
| `obra_memberships` | 3 (Inseridos) |

## Validação pós-inserção: OK?
- **Sim.** As 3 obras foram validadas com sucesso pelos IDs, e as 3 conexões de membership também estão cadastradas corretamente com a role de `gestor`.

## Pronto para Seed 04 (Orçamento)? Sim/Não
- **Sim.** O alicerce principal está estável, sem violação de constraint, garantindo integridade para popular o restante dos módulos (Orçamento, Cronograma).
