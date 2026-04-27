# DATA-CONTRACT-RISK-MATRIX

## Data
2026-04-27

---

## Top Riscos Encontrados

| Prioridade | Módulo | Tabela | Campo | Problema | Evidência | Impacto | Sprint sugerida |
|---|---|---|---|---|---|---|---|
| 1 | Auth/Multi-tenant | `company_addons` | — | RLS desabilitado em tabela multi-tenant | `rowsecurity=false` | Usuário de company A pode ler addons de company B | DATA-02A: habilitar RLS |
| 2 | Auth/Multi-tenant | `company_permission_overrides` | — | RLS desabilitado em tabela de permissões | `rowsecurity=false` | Escalada de privilégio entre companies | DATA-02A |
| 3 | Orçamento | `orcamento_composicoes` | `sinapi_preco` | Campo lido/escrito pelo frontend não existe no schema | `OrcamentoContext.tsx:252` | Sempre null — dados de preço SINAPI de composições nunca persistem | DATA-02B: migration |
| 4 | Misc | `voice_inputs` | — | Tabela acessada mas inexistente | `useVoiceInput.ts:88` com `as any` | Toda gravação de input de voz falha silenciosamente | DATA-02B: criar tabela ou remover chamada |
| 5 | Orçamento | `orcamento_versoes` | `valor_total` | Sem trigger — depende do frontend consolidar | Confirmado por auditoria SQL | Seed inserido sem chamar frontend → versão com valor_total desatualizado | DATA-02C: criar trigger |
| 6 | Orçamento | `orcamento_subitens` | `nome` vs `descricao` | Seed populou `nome`, frontend lia `descricao` | Sprint 05A.1 + 05B.1 | Todos os subitens apareciam sem nome — **CORRIGIDO** em 05B.1 | ✅ Resolvido |
| 7 | Orçamento | `orcamento_subitens` | `tipo_item` vs `origem_grupo_titulo` | Seed populou `origem_grupo_titulo`, frontend lia `tipo_item` | Sprint 05B.1 | Todos os itens classificados como Material — **CORRIGIDO** | ✅ Resolvido |
| 8 | Financeiro | `pagamentos` enum | `mao_de_obra` | `pagamento_tipo` enum usa `mao_de_obra`, orçamento usa `mao_obra` | Comparação de enums | Cruzamento financeiro×orçamento por tipo pode falhar | DATA-02D |
| 9 | Intelligence | `processamento_custos` | todos | Worker grava custo de IA mas frontend nunca lê | grep worker + grep frontend | Rastreamento de custo sem visibilidade — gasto oculto | DATA-02E |
| 10 | Cronograma | `cronograma_dependencias` | `tarefa_origem_id`/`tarefa_destino_id` | Duas FKs para mesma tabela pai | Query SQL | Joins implícitos PostgREST podem ser ambíguos | DATA-02F: usar hint explícita |

---

## Sprints Sugeridas

### 🔴 Urgente — Antes da Demo com Cliente Real

#### DATA-02A — Habilitar RLS em tabelas multi-tenant sem proteção
```sql
ALTER TABLE company_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_permission_overrides ENABLE ROW LEVEL SECURITY;
-- + criar policies adequadas
```

#### DATA-02B — Adicionar `sinapi_preco` em `orcamento_composicoes` + criar tabela `voice_inputs`
- Migration: `ALTER TABLE orcamento_composicoes ADD COLUMN sinapi_preco numeric;`
- Ou remover referência do frontend se campo não é mais necessário

### 🟡 Antes de Cliente Real Usar em Produção

#### DATA-02C — Trigger de recalculo em `orcamento_versoes.valor_total`
- Trigger AFTER INSERT/UPDATE/DELETE em `orcamento_categorias` que recalcule `valor_total` da versão
- Mesmo padrão para `preco_total` das categorias ← composições ← subitens
- Elimina dependência do frontend como único consolidador

#### DATA-02D — Padronizar enum de tipo de insumo entre módulos
- `pagamento_tipo`: `mao_de_obra` → padronizar para `mao_obra`
- `orcamento_subitens.origem_grupo_titulo`: migrar para campo `tipo_item` tipado

#### DATA-02E — Dashboard de consumo de créditos IA
- Criar UI que leia `processamento_custos` por obra/mês
- Atualmente dado é coletado mas nunca exibido

#### DATA-02F — Documentar hint explícita para FK dupla de cronograma
- Confirmar que todas as queries em `cronograma_dependencias` usam hint explícita no PostgREST
- Ou renomear colunas para eliminar ambiguidade

### 🟢 Padronizações Futuras

#### DATA-03A — Unificar `nome` vs `descricao` nos subitens
- `orcamento_subitens`: ter apenas um campo principal (`nome` ou `descricao`), deprecated o outro
- Adicionar `NOT NULL` ao campo escolhido e migrar dados

#### DATA-03B — Padronizar `valor_total` vs `preco_total`
- Definir convenção única para a hierarquia de orçamento
- Sugestão: `preco_total` em todos os níveis, `valor_total` apenas em versão

#### DATA-03C — Adicionar `company_id` em tabelas que pertencem a empresa
- `contratos_medicao_itens`, `cotacao_lote_itens`, `cotacao_respostas` etc.

### 🔵 Migrações Estruturais para Depois

#### DATA-04A — Adicionar triggers de auditoria (created_by, updated_by)
- Tabelas críticas (orçamento, pagamentos, contratos) sem rastreamento de quem alterou

#### DATA-04B — Consolidar campos SINAPI duplicados
- `sinapi_codigo`, `sinapi_fonte`, `sinapi_confidence`, `sinapi_confirmado` existem em composições E subitens mas com comportamento diferente

---

## Regras de Data Contract Recomendadas

### Convenções de Naming a Adotar

| Conceito | Convenção adotada | Onde ainda diverge |
|---|---|---|
| Nome/descrição principal de um item | `descricao` em composições, `nome` em subitens | ⚠️ Inconsistente — padronizar |
| Total monetário | `preco_total` em categorias/composições, `valor_total` em versão | ⚠️ Inconsistente |
| Tipo de insumo | `tipo_item` (código interno) + `origem_grupo_titulo` (texto legível) | ⚠️ Dois campos para mesmo conceito |
| Status de workflow | Preferir enums no banco sobre text livre | `recebiveis.status` é text livre |
| ID multi-tenant | Toda tabela deve ter `company_id` | 40 tabelas sem `company_id` |

### Regras para Novos Seeds
1. Sempre preencher `descricao` E `nome` quando a tabela tiver ambos
2. Sempre preencher `tipo_item` além de `origem_grupo_titulo`
3. Atualizar `valor_total`/`preco_total` nos pais após inserir filhos (sem trigger)
4. Nunca usar campo UUID com caracteres não-hex
5. Nunca usar valor de enum não listado no check constraint

### Regras para Novos Contextos/Hooks
1. Sempre testar fallback de campo: `row.campo_principal ?? row.campo_legado ?? default`
2. Documentar no mapper qual campo do banco mapeia para qual prop da interface
3. Nunca assumir que campo nullable terá valor — sempre usar `asOptionalString`/`asNumber`
4. Após upsert de filhos, chamar UPDATE do pai para manter total sincronizado

---

## Campos Mais Ambíguos (Top 5)

1. **`tipo_item` vs `origem_grupo_titulo`** — dois campos para classificação de natureza do insumo
2. **`nome` (subitens) vs `descricao` (composições)** — mesmo conceito semântico, nome diferente
3. **`preco_total` vs `valor_total`** — mesmo conceito na hierarquia do orçamento
4. **`etapa_id` em composições** — aponta para `orcamento_categorias`, não para uma "etapa" separada
5. **`mao_de_obra` vs `mao_obra`** — mesmo tipo, grafia diferente entre módulos

---

## Confirmação

- Zero código alterado
- Zero banco alterado
- Zero migrations criadas
- Auditoria baseada em: SQL via MCP + grep no `src/` + grep no `worker/`
