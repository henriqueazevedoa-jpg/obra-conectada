# DATA-CONTRACT-AUDIT

## Data
2026-04-27

## Totais
- **Total de tabelas no banco (public schema):** 107
- **Arquivos frontend inspecionados:** ~80 (todos em `src/contexts/`, `src/hooks/`, `src/components/`, `src/pages/`)
- **Tabelas acessadas pelo frontend:** ~42 distintas
- **Tabelas acessadas pelo worker Python:** 5 (`projeto_arquivos`, `projeto_chunks`, `projeto_paginas_raw`, `projeto_quantitativos`, `processamento_custos`, `obras`)
- **Campos com divergência banco × frontend confirmados:** 8 críticos documentados abaixo

---

## 1. RLS — Tabelas sem Row Level Security

As seguintes tabelas têm `rowsecurity = false` (sem RLS):

| Tabela | Tipo | Risco |
|--------|------|-------|
| `addon_catalog` | Global (catálogo) | BAIXO — leitura pública intencional |
| `company_addons` | Multi-tenant | **ALTO** — sem RLS, qualquer auth lê addons de todas as companies |
| `company_permission_overrides` | Multi-tenant | **ALTO** — permissões sem isolamento |
| `sinapi_composicao_custos` | Global SINAPI | BAIXO — tabela pública de referência |
| `sinapi_composicao_itens` | Global SINAPI | BAIXO |
| `sinapi_composicoes` | Global SINAPI | BAIXO |
| `sinapi_insumo_precos` | Global SINAPI | BAIXO |
| `sinapi_insumos` | Global SINAPI | BAIXO |
| `sinapi_referencias` | Global SINAPI | BAIXO |

> **Bloqueador potencial:** `company_addons` e `company_permission_overrides` não têm RLS. Um usuário autenticado de qualquer empresa poderia ler/modificar permissões de outras empresas dependendo das políticas do PostgREST.

---

## 2. Tabelas sem `company_id` (risco multi-tenant)

40 tabelas não possuem `company_id`. Relevantes:

| Tabela | Tem `obra_id`? | Risco |
|--------|---------------|-------|
| `contratos` | Sim | MÉDIO — isolado por obra_id |
| `contratos_medicoes` | Sim | MÉDIO |
| `contratos_medicao_itens` | Não | **ALTO** — sem anchor multi-tenant |
| `cronograma_dependencias` | Sim | MÉDIO |
| `cronograma_alocacoes` | Não (só tarefa_id) | MÉDIO |
| `cotacao_lote_itens` | Não | MÉDIO |
| `cotacao_respostas` | Não | MÉDIO |
| `diario_*` (fotos, materiais, serviços) | Sim | BAIXO |
| `insumos_pendentes_cotacao` | Sim | MÉDIO |
| `pagamentos` | Sim | MÉDIO |
| `recebiveis` | Sim | MÉDIO |
| `sinapi_*` | Não | BAIXO — globais intencionais |

---

## 3. Schema — Módulo de Orçamento (núcleo do sistema)

### `orcamento_subitens`
| Campo no banco | Tipo | Obrigatório | Lido pelo frontend | Escrito pelo seed | Divergência |
|---|---|---|---|---|---|
| `nome` | text | NOT NULL | ❌ (`dbToInsumo` lia `descricao`) | ✅ | **ALTO** — corrigido na Sprint 05B.1 com fallback |
| `descricao` | text | nullable | ✅ `row.descricao` | ❌ null | MÉDIO — campo legado, seed usa `nome` |
| `tipo_item` | text | nullable | ✅ `row.tipo_item` | ❌ null | **ALTO** — corrigido na 05B.1 com fallback de `origem_grupo_titulo` |
| `origem_grupo_titulo` | text | nullable | ✅ (lido mas não usado como tipo) | ✅ `'Material'/'Mão de Obra'/'Equipamento'` | MÉDIO — dois campos para mesma semântica |
| `preco_unitario` | numeric | nullable | ✅ | ✅ | OK |
| `preco_total` | numeric | nullable | ✅ | ✅ | OK |
| `custo_unitario` | numeric | nullable | ❌ nunca lido | ✅ | BAIXO — campo shadow não consumido |
| `custo_total` | numeric | nullable | ❌ nunca lido | ✅ | BAIXO — campo shadow não consumido |
| `composicao_id` | uuid | nullable | ✅ (como FK para agrupar) | ✅ | OK |
| `categoria_id` | uuid | NOT NULL | ✅ (filtro `in('categoria_id',...)`) | ✅ | OK mas: query filtra por `categoria_id`, não por `composicao_id.etapa_id` → risco de subitens órfãos invisíveis |

**Problema estrutural:** O `fetchOrcamento` filtra subitens por `.in('categoria_id', categoriaIds)` mas os seeds mais antigos usavam a lógica de `composicao_id`. Subitens sem `categoria_id` preenchido nunca aparecem.

### `orcamento_composicoes`
| Campo | Banco | Frontend lê | Frontend escreve | Divergência |
|---|---|---|---|---|
| `descricao` | NOT NULL, default `''` | ✅ | ✅ | OK |
| `etapa_id` | NOT NULL (FK para categorias) | ✅ (`c.etapa_id`) | ✅ | OK mas nome confuso: "etapa" → deveria ser `categoria_id` |
| `tipo` | nullable, default `'composicao'` | ✅ | ✅ | OK |
| `tipo_item` | nullable, default `'material'` | ✅ | ✅ | OK |
| `usa_subitens` | NOT NULL | ✅ (`row.usa_subitens`) | ✅ | OK |
| `sinapi_preco` | **NÃO EXISTE no banco** | ✅ `row.sinapi_preco` | ✅ escrito | **ALTO** — campo lido/escrito mas inexistente no schema |

### `orcamento_categorias`
| Campo | Banco | Frontend lê | Notas |
|---|---|---|---|
| `nome` | NOT NULL | ✅ `row.nome` | OK |
| `preco_total` | NOT NULL | ✅ | OK |
| `usa_composicoes` | NOT NULL | ✅ `row.usa_composicoes` | OK |
| `versao_id` | nullable | ✅ | OK |
| `parent_id` | nullable | ✅ | OK — suporte N-níveis |

### `orcamento_versoes`
| Campo | Banco | Frontend | Notas |
|---|---|---|---|
| `valor_total` | NOT NULL | ✅ escrito por `salvarVersao` após calcular soma | **SEM TRIGGER** — depende totalmente do frontend |
| `tipo` | check constraint: `estimativo`, `analitico`, `revisao` | ✅ | OK |
| `status` | `rascunho`, `ativo`, `arquivado` | ✅ | OK |

---

## 4. Schema — Módulo Cronograma

### `cronograma_tarefas`
| Campo relevante | Notas |
|---|---|
| `nome` | Usado pelo frontend |
| `tipo_tarefa` | Default `'PADRAO'` — frontend usa `tipo_tarefa === 'MARCO'` etc. em CAIXA ALTA |
| `status` | Text livre, sem enum no banco — risco de divergência de valores |
| `company_id` | nullable — nem sempre preenchido pelos seeds |
| `orcamento_categoria_id` / `orcamento_composicao_id` | FKs para vincular cronograma ao orçamento — não verificado se populados |

### `cronograma_dependencias` — FK duplicada ⚠️
- `tarefa_origem_id` → `cronograma_tarefas`
- `tarefa_destino_id` → `cronograma_tarefas`
- **Duas FKs para a mesma tabela pai** — risco de ambiguidade no PostgREST se query usar join implícito.

---

## 5. Schema — Módulo Financeiro

### `pagamentos`
| Campo | Notas |
|---|---|
| `valor_previsto` | Principal campo de valor |
| `valor_pago` | Nullable — nem sempre preenchido |
| `valor_parcela` | Default 0 — campo redundante com `valor_previsto`? |
| `status` | enum `pagamento_status`: `previsto`, `pago`, `atrasado`, `cancelado` — sem `parcial` |
| `tipo_pagamento` | enum `pagamento_tipo`: `material`, `mao_de_obra`, `servico`, `aluguel`, `outro` — note `mao_de_obra` com underline diferente do `mao_obra` do orçamento |

### `recebiveis`
| Campo | Notas |
|---|---|
| `status` | text livre (`pendente`, `recebido`, `parcial`, `cancelado`) — `parcial` não estava na condição `isPendente` do frontend (corrigido) |
| `valor_faturado` / `valor_recebido` | Dois campos de valor distintos — ok semanticamente |

---

## 6. Schema — Módulo Intelligence / Worker

### Worker Python acessa:
| Tabela | Operação | Campos escritos | Frontend consome? |
|--------|----------|-----------------|-------------------|
| `projeto_arquivos` | SELECT/UPDATE | `status`, `tentativas_extracao`, `total_paginas`, `paginas_processadas`, `classificado`, `erro_mensagem` | ✅ parcial |
| `projeto_paginas_raw` | INSERT | `arquivo_id`, `numero_pagina`, `texto_extraido`, `tem_texto` | ❌ não lido diretamente |
| `projeto_chunks` | INSERT | `arquivo_id`, `pagina_raw_id`, `obra_id`, `company_id`, `numero_pagina`, `texto`, `disciplina`, `tipo_conteudo`, `relevancia`, `resumo`, `confianca`, `entidades_extraidas` | ✅ lido via `useQuantitativos` |
| `projeto_quantitativos` | UPSERT | `obra_id`, `company_id`, `disciplina`, `tipo`, `dados`, `fonte`, `confianca` | ✅ lido |
| `processamento_custos` | INSERT | `arquivo_id`, `obra_id`, `company_id`, `fase`, `modelo`, `tokens_entrada`, `tokens_saida`, `unidades`, `custo_usd` | ❌ nunca lido pelo frontend |
| `obras` | UPDATE | `quantitativos_status`, `quantitativos_gerados_em` | ✅ |

**Problema:** `processamento_custos` é gravado pelo worker em toda operação de IA mas nunca exibido no frontend. Custo financeiro rastreado mas sem UI de monitoramento.

---

## 7. Campos Ambíguos por Naming

| Campo semântico | Tabela A | Campo em A | Tabela B | Campo em B | Divergência |
|---|---|---|---|---|---|
| Nome do subitem | `orcamento_subitens` | `nome` (NOT NULL) | `orcamento_composicoes` | `descricao` (NOT NULL) | **ALTO** — naming diferente para mesmo conceito no nível filho |
| Tipo do insumo | `orcamento_subitens` | `origem_grupo_titulo` (text livre) | `orcamento_composicoes` | `tipo_item` (text) | **ALTO** — dois campos, semântica igual |
| Total monetário | `orcamento_versoes` | `valor_total` | `orcamento_categorias` | `preco_total` | MÉDIO — naming inconsistente na hierarquia |
| Total monetário | `custo_real_itens` | `valor` | `pagamentos` | `valor_previsto` / `valor_pago` | MÉDIO |
| Status do workflow | `pagamentos` | `pagamento_status` (enum) | `recebiveis` | `status` (text livre) | MÉDIO — enum vs text |
| Tipo de insumo | `pagamentos` enum | `mao_de_obra` | `orcamento_subitens` | `mao_obra` | **ALTO** — underline diferente entre módulos |
| Etapa/Categoria | `orcamento_composicoes` | `etapa_id` (FK → categorias) | `custo_real_itens` | `etapa_id` (FK → categorias) | MÉDIO — nome `etapa_id` mas aponta para `orcamento_categorias` |
| Link de arquivo | `projeto_arquivos` | `storage_path` | `doc_uploads` | campo diferente | BAIXO |

---

## 8. FKs Duplicadas para Mesma Tabela Pai (risco PostgREST)

| Tabela filha | Tabela pai | FKs | Risco |
|---|---|---|---|
| `cronograma_dependencias` | `cronograma_tarefas` | `tarefa_origem_id`, `tarefa_destino_id` | **MÉDIO** — PostgREST pode ficar ambíguo em joins implícitos; correto com hint explícita |

**Nenhuma outra** tabela com múltiplas FKs para o mesmo pai foi detectada além de `cronograma_dependencias`.

---

## 9. Totalizadores sem Trigger (dependem do frontend)

| Campo | Tabela | Quem consolida | Risco de dessincronização |
|---|---|---|---|
| `valor_total` | `orcamento_versoes` | `OrcamentoContext.salvarVersao()` | **ALTO** — se seed inserir dados sem chamar o frontend, valor fica desatualizado |
| `preco_total` | `orcamento_categorias` | `OrcamentoContext.saveOrcamento()` | **ALTO** |
| `preco_total` | `orcamento_composicoes` | `OrcamentoContext.saveOrcamento()` | **ALTO** |
| `percentual_concluido` | `cronograma_tarefas` | Frontend (useCronograma) | MÉDIO |
| `percentual_andamento` | `obras` | Frontend | MÉDIO |

**Sem nenhum trigger de recalculo automático detectado** nas tabelas de orçamento.

---

## 10. `sinapi_preco` — Campo Inexistente no Schema

O frontend (`dbToComposicao` e `saveOrcamento`) lê e escreve `sinapi_preco` em `orcamento_composicoes`, mas este campo **não existe** na tabela conforme schema auditado.

```ts
// OrcamentoContext.tsx linha ~252
sinapiPreco: row.sinapi_preco != null ? Number(row.sinapi_preco) : null,
```

Resultado: silenciosamente retorna `null` em todas as composições. Provavelmente foi planejado mas nunca migrado.

---

## 11. `voice_inputs` — Tabela Acessada mas Inexistente

```ts
// useVoiceInput.ts linha 88
await (supabase as any).from('voice_inputs').insert({...})
```

A tabela `voice_inputs` **não existe no schema**. O cast `as any` suprime o erro de tipo. Toda gravação de voz falha silenciosamente.

---

## 12. Frontend × Worker — Campos Produzidos mas não Consumidos

| Campo | Gravado por | Consumido por | Status |
|---|---|---|---|
| `processamento_custos.*` | Worker Python | Ninguém no frontend | ❌ dado órfão |
| `projeto_paginas_raw.*` | Worker Python | Ninguém no frontend | ❌ dado intermediário sem UI |
| `custo_unitario` em `orcamento_subitens` | Seed 05B | Ninguém no frontend | ❌ campo shadow |
| `custo_total` em `orcamento_subitens` | Seed 05B | Ninguém no frontend | ❌ campo shadow |
| `embedding` em `projeto_chunks` | Não identificado | Não identificado | ❓ possivelmente para busca vetorial futura |

---

## 13. Seeds × Frontend — Campos Preenchidos vs Lidos

| Campo | Seed preenche | Frontend lê | Divergência |
|---|---|---|---|
| `nome` (subitens) | ✅ | ✅ (após fix 05B.1) | Resolvido |
| `descricao` (subitens) | ❌ null | ✅ (com fallback) | Resolvido |
| `origem_grupo_titulo` | ✅ `'Material'` etc | ✅ (após fix 05B.1) | Resolvido |
| `tipo_item` | ❌ null | ✅ (com fallback) | Resolvido |
| `custo_total` | ✅ | ❌ | Campo shadow não consumido |
| `codigo` | ❌ null (subitens) | ✅ exibido | Subitens sem código visível |
| `versao_id` (categorias) | ✅ | ✅ | OK |

---

## Confirmação de Integridade

- Zero SQL de escrita executado nesta auditoria
- Zero arquivos de produção alterados
- Zero migrations criadas
