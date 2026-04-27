# SEED-05A1-ROOT-CAUSE-AUDIT

## Data
2026-04-27

---

## Resumo Executivo

| Questão | Resposta |
|---------|----------|
| 1. Totalizador manual sem filhos? | **SIM** — 2 categorias (Alvenaria e Cobertura) têm `preco_total` positivo mas zero composições/subitens |
| 2. Ausência de composições/subitens? | **SIM** — Apenas 5 categorias das 16 planejadas existem; apenas 6 composições de ~65; apenas 21 de ~120 subitens |
| 3. Frontend lendo fonte diferente? | **PARCIALMENTE** — o `OrcamentoContext` lê `preco_total` nos subitens, mas a seed 04 não preencheu `custo_total` (campo de leitura dos cards por natureza) |
| 4. Campo obrigatório não preenchido? | **SIM** — `custo_total` e `custo_unitario` presentes na tabela mas **completamente nulos** nos 21 subitens do seed 04 |
| 5. Classificação/natureza ausente? | **SIM** — `origem_grupo_titulo` está `NULL` em todos os subitens; não há campo de natureza nativo (MO/MAT/EQ) na tabela |
| 6. Risco de repetir na 05B? | **ALTO** sem as correções documentadas abaixo |

---

## Parte 1 — Hierarquia do Orçamento da Obra a1

### Counts reais do banco
| Item | Atual | Meta 05B |
|------|-------|----------|
| Categorias | 5 | 16 |
| Composições | 6 | ~65 |
| Subitens | 21 | ~120 |

### Status por categoria
| Categoria | preco_total | Compos. | Subitens | Soma subitens | Status |
|-----------|-------------|---------|----------|---------------|--------|
| Alvenaria e Fechamentos | R$ 25.000 | 0 | 0 | R$ 0 | **CATEGORIA_COM_TOTAL_SEM_COMPOSICOES** |
| Cobertura | R$ 25.000 | 0 | 0 | R$ 0 | **CATEGORIA_COM_TOTAL_SEM_COMPOSICOES** |
| Estrutura | R$ 60.000 | 2 | 11 | R$ 60.000 | OK |
| Fundações | R$ 35.000 | 2 | 5 | R$ 35.000 | OK |
| Serviços Preliminares | R$ 5.000 | 2 | 5 | R$ 5.000 | OK |

### Análise
As 3 categorias com `status = OK` têm dados coerentes porque fazem parte das `04_orcamento.sql` + enriquecimento `04c`. As 2 categorias com `CATEGORIA_COM_TOTAL_SEM_COMPOSICOES` existem no banco com valor pré-definido no `INSERT` mas sem hierarquia filha (categorias "fantasma").

---

## Parte 2 — Versão Ativa e Totalizadores

| Campo | Valor | Coerente? |
|-------|-------|-----------|
| `versao_id` | `f1000000-...0001` | — |
| `numero_versao` | v1.0 | — |
| `tipo` | estimativo | — |
| `status` | ativo | — |
| `valor_total` (salvo) | **R$ 150.000** | ❌ Não |
| `soma_categorias` (real) | **R$ 150.000** | = versão |
| `soma_composicoes` (real) | **R$ 100.000** | Diverge +50k da versão |
| `soma_subitens` (real) | **R$ 100.000** | Diverge +50k da versão |

### Causa da divergência
A versão e a soma de categorias coincidem (R$ 150k) porque **as 2 categorias "fantasma"** têm `preco_total = R$ 25.000` cada, totalizando R$ 50.000 extras que não têm nenhum filho real. O valor correto derivado dos subitens seria R$ 100.000.

---

## Parte 3 — Campos Usados pelo Frontend

### OrcamentoContext.tsx
| Camada | Campo lido do banco | Mapeamento interno | Observação |
|--------|--------------------|--------------------|------------|
| Subitem | `preco_total` | `precoTotal` | Preenchido na seed 04C ✅ |
| Subitem | `custo_total` | (não mapeado em OrcamentoContext) | Campo existe na tabela, mas é NULL em todos os subitens do seed ⚠️ |
| Subitem | `custo_unitario` | (não mapeado em OrcamentoContext) | Idem ⚠️ |
| Composição | `preco_total` | `precoTotal` | Preenchido ✅ |
| Categoria | `preco_total` | `precoTotal` | Preenchido (inclusive nas fantasmas) ✅/❌ |
| Versão | `valor_total` | `valorTotal` | Salvo mas divergente ❌ |

### GestorDashboard.tsx
| Tela | Campo | Source | Risco |
|------|-------|--------|-------|
| Dashboard gestor (KPI custo previsto) | `orcamento_categorias.preco_total` | Soma das categorias da obra | **MÉDIO** — inclui as 2 categorias fantasma sem subitens |

### Supabase Types — campos extras em `orcamento_subitens`
O arquivo `types.ts` declara `custo_total` e `custo_unitario` como campos opcionais. O `OrcamentoContext.tsx` ativo **NÃO os lê nem os escreve**. São campos legados do schema inicial. Não afetam a exibição atual do frontend.

---

## Parte 4 — Natureza/Tipo dos Subitens

### Achado crítico
Não existe coluna nativa de natureza (material/mão de obra/equipamento) em `orcamento_subitens`. O campo `origem_grupo_titulo` serve como proxy e está **NULL em 100% dos registros do seed atual**.

### Distribuição atual (inferida por nome/unidade)
| Natureza inferida | Qtd subitens | Total |
|-------------------|-------------|-------|
| Material | ~16 | ~R$ 75.000 |
| Mão de Obra | ~5 | ~R$ 25.000 |
| Sem classificação formal | 21 | R$ 100.000 |

### Impacto para 05B
Se algum componente de dashboard exibir "custo por natureza", **vai mostrar vazio** para os subitens do seed, pois `origem_grupo_titulo = NULL`. Recomenda-se preencher este campo com `'Material'`, `'Mão de Obra'` ou `'Equipamento'`.

---

## Parte 5 — Órfãos e Invisíveis

| Verificação | Resultado |
|-------------|-----------|
| Composições sem categoria válida | 0 ✅ |
| Subitens sem composição válida | 0 ✅ |
| Subitens sem categoria válida | 0 ✅ |
| Registros associados a versão inativa | N/A (só 1 versão) |
| Categorias com valor mas sem filhos ("fantasmas") | **2** ❌ |

---

## Achados Consolidados

| Criticidade | Achado | Evidência | Impacto | Como evitar na 05B |
|-------------|--------|-----------|---------|-------------------|
| 🔴 CRÍTICO | 2 categorias com `preco_total > 0` e zero composições | Alvenaria R$25k, Cobertura R$25k — status `CATEGORIA_COM_TOTAL_SEM_COMPOSICOES` | Dashboard mostra R$150k mas só R$100k existe em subitens | **Nunca inserir categoria com total sem composições filhas** |
| 🔴 CRÍTICO | EAP incompleta: 5 categorias reais vs 16 planejadas | Apenas Prelim., Fundações, Estrutura, Alvenaria*, Cobertura* existem | Tela de planilha mostra orçamento com apenas 37% da EAP | Criar as 16 etapas na 05B com todas as composições filhas |
| 🟡 ALTO | `valor_total` da versão (R$150k) diverge da soma real de subitens (R$100k) | Audit 04E + confirmado aqui | Versão exibe total inflado por R$50k | Após seed, executar UPDATE para alinhar valor_total |
| 🟡 ALTO | `custo_total` e `custo_unitario` são NULL em 100% dos subitens | 21/21 subitens com `custo_total = NULL` | Campos legados não afetam UI atual, mas se ativados quebrariam análises de custo | Preencher com mesmo valor de `preco_total` por segurança |
| 🟡 ALTO | `origem_grupo_titulo` NULL em todos os subitens | 21/21 com NULL | Dashboard de natureza (se existir) mostraria vazio | Preencher com 'Material', 'Mão de Obra' ou 'Equipamento' |
| 🟢 BAIXO | Hierarquia de 3 categorias OK está coerente | Estrutura/Fundações/Prelim. com soma correta | Funciona bem, serve de modelo | Manter mesmo padrão na 05B |

---

## Regras Obrigatórias para a Seed 05B

1. **Nunca inserir categoria com `preco_total > 0` sem composições filhas** — o valor deve ser calculado somente após inserir os subitens.
2. **Nunca inserir composição com `preco_total > 0` sem subitens filhos** — idem.
3. **Todo subitem deve ter `composicao_id` E `categoria_id` válidos** (NOT NULL nas duas colunas).
4. **Preencher `custo_total = preco_total` e `custo_unitario = preco_unitario`** nos subitens para garantir compatibilidade com campos legados.
5. **Preencher `origem_grupo_titulo`** com `'Material'`, `'Mão de Obra'` ou `'Equipamento'` em cada subitem.
6. **Calcular `preco_total` das composições como a soma dos subitens filhos** antes de inserir.
7. **Calcular `preco_total` das categorias como a soma das composições filhas** antes de inserir.
8. **Calcular `valor_total` da versão como a soma de todas as categorias** antes de inserir.
9. **Usar apenas `company_id = bbbbbbbb...0001` e `obra_id = a1...0001`**.
10. **Quebrar a seed em scripts menores** (cleanup, versão+categorias, composições, subitens) para facilitar rollback.
11. **Não usar categorias "fantasma"** — toda categoria inserida deve ter pelo menos 1 composição com pelo menos 1 subitem.
12. **Validar via SELECT após cada bloco** antes de avançar para o próximo.

---

## Recomendação

**É seguro executar a 05B desde que:**
1. O script de limpeza (`05b_cleanup_a1.sql`) delete TODOS os dados atuais da obra a1 (5 categorias existentes, 6 composições, 21 subitens) antes de inserir a nova EAP realista.
2. Os scripts sigam rigorosamente as 12 regras acima.
3. Cada script seja validado individualmente via SELECT antes de avançar.

**Não é necessário corrigir o banco atual** (pois a 05B vai recriar tudo do zero para a obra a1).

---

## Relatório Final

1. **Causa raiz mais provável:** Seed 04 inseriu categorias "fantasma" com `preco_total` manual sem hierarquia filha, e a EAP foi drasticamente incompleta (5 de 16 etapas, 6 de ~65 composições).
2. **Total de categorias inconsistentes:** 2 (Alvenaria e Cobertura — `CATEGORIA_COM_TOTAL_SEM_COMPOSICOES`).
3. **Total de composições órfãs:** 0.
4. **Total de subitens órfãos:** 0.
5. **Frontend lê totais de:** `orcamento_categorias.preco_total` no Dashboard; `preco_total` de composições e categorias na Planilha via `OrcamentoContext`.
6. **Campos obrigatórios na 05B:** `id`, `composicao_id`, `categoria_id`, `company_id`, `nome`, `unidade`, `quantidade`, `preco_unitario`, `preco_total` + recomendados: `custo_unitario`, `custo_total`, `origem_grupo_titulo`.
7. **É seguro executar a 05B?** **Sim**, desde que inicie com limpeza completa dos dados atuais da obra a1 e siga as 12 regras listadas.
