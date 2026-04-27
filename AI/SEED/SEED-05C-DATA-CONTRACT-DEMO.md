# SEED-05C — Data Contract Mínimo para Seeds Restantes

> **Sprint**: SEED-05C · Somente auditoria  
> **Data**: 2026-04-27  
> **Status**: ✅ Completo

---

## Resumo Executivo

Mapeamento campo-a-campo de **14 módulos** que ainda precisam de seed
para a obra vitrine. Para cada módulo, documenta-se:

1. **Tabela DB** → colunas reais (schema)
2. **Frontend interface** → campos que a tela lê / grava
3. **Discrepâncias** → campos com nome diferente entre DB e frontend
4. **Campos obrigatórios para seed** → mínimo para tela funcionar
5. **Enums / valores válidos** → para evitar erros de enum

---

## Convenções

| Símbolo | Significado |
|---------|-------------|
| ✅ | Campo alinhado DB ↔ Frontend |
| ⚠️ | Discrepância de naming / tipo |
| 🚫 | Tabela não existe no DB |
| 🔑 | Campo NOT NULL obrigatório |

---

## 1. Pagamentos

### Tabela: `pagamentos`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava | Notas |
|----------|------|----------|-------------|----------------|-------|
| `id` | uuid | 🔑 | ✅ `p.id` | auto | gen_random_uuid() |
| `obra_id` | uuid | 🔑 | ✅ `p.obra_id` | ✅ | FK → obras |
| `descricao` | text | 🔑 | ✅ | ✅ | default '' |
| `tipo_pagamento` | enum `pagamento_tipo` | 🔑 | ✅ | ✅ | Valores: `material`, `mao_de_obra`, `servico`, `aluguel`, `outro` |
| `valor_previsto` | numeric | 🔑 | ✅ | ✅ | default 0 |
| `data_vencimento` | date | 🔑 | ✅ | ✅ | |
| `status` | enum `pagamento_status` | 🔑 | ✅ | ✅ | Valores: `previsto`, `pago`, `atrasado`, `cancelado` |
| `forma_pagamento` | enum `forma_pagamento` | 🔑 | ✅ | ✅ | Valores: `boleto`, `pix`, `cartao`, `transferencia`, `dinheiro`, `outro` |
| `fornecedor` | text | - | ✅ | ✅ | nome textual |
| `numero_parcela` | int | - | ✅ | ✅ | |
| `total_parcelas` | int | - | ✅ | ✅ | |
| `observacoes` | text | - | ✅ | ✅ | |
| `etapa_orcamento` | text | - | ✅ | ✅ | nome da etapa (não UUID) |
| `data_compra` | date | - | ✅ | ✅ | default CURRENT_DATE |
| `data_pagamento` | date | - | ✅ | ✅ | |
| `valor_parcela` | numeric | - | ✅ | ✅ | |
| `categoria_id` | uuid | - | - | - | FK → orcamento_categorias, não usado no frontend |
| `etapa_id` | uuid | - | - | - | FK → orcamento_categorias, não usado no frontend |
| `composicao_id` | uuid | - | - | - | FK → orcamento_composicoes, não usado no frontend |
| `fornecedor_id` | uuid | - | - | - | FK → fornecedores, não usado no frontend principal |
| `cronograma_task_id` | uuid | - | - | - | FK → cronograma_tarefas |
| `valor_pago` | numeric | - | - | - | não usado no frontend |
| `pedido_id` | uuid | - | - | - | FK → material_pedidos |

### Seed mínimo (7 campos NOT NULL):
```sql
INSERT INTO pagamentos (obra_id, descricao, tipo_pagamento, valor_previsto,
  data_vencimento, status, forma_pagamento) VALUES (...);
```

### ⚠️ Alerta: Frontend auto-marca `atrasado`
O frontend executa `UPDATE status='atrasado'` em pagamentos com
`status='previsto'` e `data_vencimento < hoje`. Para seed demo, usar
datas futuras ou status `pago`.

---

## 2. Recebíveis

### Tabela: `recebiveis`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ | auto |
| `obra_id` | uuid | 🔑 | ✅ | ✅ |
| `contrato_id` | uuid | - | ✅ | - |
| `medicao_id` | uuid | - | ✅ | - |
| `descricao` | text | 🔑 | ✅ | - |
| `valor_faturado` | numeric | 🔑 | ✅ | - |
| `valor_recebido` | numeric | 🔑 | ✅ | ✅ (update) |
| `status` | text | 🔑 | ✅ | ✅ (update) |
| `data_emissao` | date | - | ✅ | - |
| `data_vencimento` | date | - | ✅ | - |
| `data_recebimento` | date | - | ✅ | ✅ (update) |
| `forma_recebimento` | text | - | ✅ | ✅ (update) |
| `numero_nf` | text | - | ✅ | ✅ (update) |
| `observacoes` | text | - | ✅ | ✅ (update) |

### Status válidos (frontend + DB):
`pendente` | `a_vencer` | `vencido` | `recebido` | `parcial` | `cancelado`

> **Nota**: O frontend calcula `statusDinamico` a partir de `status` + `data_vencimento`.
> Para seed demo, usar `status = 'pendente'` com `data_vencimento` futuro.

### Seed mínimo:
```sql
INSERT INTO recebiveis (obra_id, descricao, valor_faturado, valor_recebido, status)
VALUES (...);
```

---

## 3. Custo Real

### Tabela: `custo_real_itens`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ `.id` | ✅ |
| `obra_id` | uuid | 🔑 | ✅ `.obra_id` → `obraId` | ✅ |
| `company_id` | uuid | 🔑 | ✅ `.company_id` → `companyId` | ✅ |
| `categoria` | text | - | ✅ | ✅ |
| `descricao` | text | 🔑 | ✅ | ✅ |
| `fornecedor` | text | - | ✅ | ✅ |
| `data` | date | - | ✅ | ✅ |
| `valor` | numeric | - | ✅ Number() | ✅ |
| `observacoes` | text | - | ✅ | ✅ |
| `etapa_nome` | text | - | ✅ | ✅ |
| `etapa_id` | uuid | - | - | - |
| `composicao_id` | uuid | - | - | - |
| `quantidade` | numeric | - | - | - |
| `valor_unitario` | numeric | - | - | - |

### Categorias válidas (frontend `CATEGORIAS_CUSTO`):
`Mão de Obra` | `Material` | `Serviço` | `Aluguel` | `Outro`

### Seed mínimo:
```sql
INSERT INTO custo_real_itens (obra_id, company_id, descricao) VALUES (...);
```

---

## 4. Contratos

### Tabela: `contratos`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ | auto |
| `obra_id` | uuid | 🔑 | ✅ | ✅ |
| `numero` | text | 🔑 | ✅ | ✅ |
| `tipo` | text | 🔑 | ✅ | ✅ |
| `descricao` | text | 🔑 | ✅ | ✅ |
| `contratado` | text | 🔑 | ✅ | ✅ |
| `valor_inicial` | numeric | 🔑 | ✅ | ✅ |
| `valor_atual` | numeric | 🔑 | ✅ | ✅ |
| `modalidade_medicao` | text | 🔑 | ✅ | ✅ |
| `status` | text | 🔑 | ✅ | ✅ |
| `data_inicio` | date | - | ✅ | ✅ |
| `data_fim_prevista` | date | - | ✅ | ✅ |
| `cnpj` | text | - | ✅ | ✅ |

### Tipo válidos (CHECK constraint do DB):
`cliente` | `empreiteiro` | `fornecedor`

> ⚠️ Frontend mostra `fornecedor_material`, `prestador_servico`, `consultor` — mas DB rejeita.

### Status válidos (CHECK constraint do DB):
`rascunho` | `ativo` | `suspenso` | `encerrado` | `rescindido`

### Modalidade medição (CHECK constraint do DB):
`percentual` | `quantidade` | `misto` | `valor_fixo`

> ⚠️ Frontend mostra `preco_unitario`, `global` — mas DB rejeita.

---

## 5. Contratos Medições

### Tabela: `contratos_medicoes`

| Campo DB | Tipo | NOT NULL | Frontend lê |
|----------|------|----------|-------------|
| `id` | uuid | 🔑 | ✅ |
| `obra_id` | uuid | 🔑 | ✅ |
| `contrato_id` | uuid | 🔑 | ✅ FK |
| `numero_medicao` | int | 🔑 | ✅ |
| `data_referencia` | date | 🔑 | ✅ |
| `status` | text | 🔑 | ✅ |
| `valor_periodo` | numeric | - | ✅ (soma KPI) |
| `percentual_periodo` | numeric | - | ✅ |
| `percentual_acumulado` | numeric | - | ✅ |

### Status válidos (CHECK constraint do DB):
`rascunho` | `emitido` | `aprovado` | `contestado` | `pago`

> ⚠️ Frontend usa `pendente` que não existe no check. Usar `emitido`.

---

## 6. Cronograma Tarefas

### Tabela: `cronograma_tarefas`

| Campo DB | Tipo | Frontend lê (useCronograma) | Obrigatório Seed |
|----------|----|---------------------------|------------------|
| `id` | uuid | ✅ | auto |
| `obra_id` | uuid | ✅ | ✅ |
| `nome` | text | ✅ | ✅ |
| `etapa` | text | ✅ | recomendado |
| `data_inicio` | date | ✅ | ✅ |
| `data_fim` | date | ✅ | ✅ |
| `duracao_dias` | int | ✅ | ✅ |
| `percentual_concluido` | int | ✅ | default 0 |
| `status` | text | ✅ | recomendado |
| `tipo_tarefa` | text | ✅ | default 'PADRAO' |
| `parent_tarefa_id` | uuid | ✅ (hierarquia) | se sub-tarefa |
| `nivel` | int | ✅ | default 1 |
| `ordem` | int | ✅ | recomendado |
| `peso_orcamento` | numeric | ✅ | default 0 |
| `is_critico` | boolean | ✅ | default false |
| `cor` | text | ✅ | opcional |
| `baseline_inicio` | date | ✅ | recomendado |
| `baseline_fim` | date | ✅ | recomendado |
| `nota` | text | ✅ | opcional |
| `orcamento_categoria_id` | uuid | ✅ FK | FK → orcamento_categorias |
| `orcamento_composicao_id` | uuid | ✅ FK | FK → orcamento_composicoes |
| `company_id` | uuid | - | recomendado |
| `versao_id` | uuid | - | FK → cronograma_versoes |

### Status válidos (frontend):
`pendente` | `em_andamento` | `concluido` | `atrasado`

### tipo_tarefa válidos:
`PADRAO` | `MARCO` | `GRUPO`

---

## 7. Cronograma Dependências

### Tabela: `cronograma_dependencias`

| Campo DB | Tipo | Frontend lê |
|----------|------|-------------|
| `id` | uuid | ✅ |
| `obra_id` | uuid | ✅ |
| `tarefa_origem_id` | uuid | ✅ FK |
| `tarefa_destino_id` | uuid | ✅ FK |
| `tipo` | text | ✅ |
| `lag_dias` | int | ✅ default 0 |

### Tipo válidos:
`FS` (finish-start) | `SS` (start-start) | `FF` (finish-finish) | `SF` (start-finish)

---

## 8. Diário de Obra

### Tabela: `diario_registros`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ | auto |
| `obra_id` | uuid | 🔑 | ✅ | ✅ |
| `user_id` | uuid | - | ✅ | ✅ |
| `usuario_nome` | text | 🔑 | ✅ | ✅ |
| `data` | date | 🔑 | ✅ | ✅ |
| `clima` | enum `clima_tipo` | 🔑 | ✅ | ✅ |
| `trabalhadores` | int | 🔑 | ✅ | ✅ |
| `servicos_executados` | text | - | ✅ | ✅ |
| `observacoes` | text | - | ✅ | ✅ |
| `problemas` | text | - | ✅ | ✅ |
| `status` | enum `diario_status` | 🔑 | ✅ | ✅ |
| `urgente` | boolean | - | ✅ | ✅ |
| `etapas_vinculadas` | uuid[] | - | ✅ | ✅ |
| `membros_presentes` | uuid[] | - | ✅ | ✅ |
| `materiais_faltantes` | jsonb | - | ✅ | ✅ |

### clima_tipo (enum):
`sol` | `nublado` | `chuva` | `chuvoso_forte`

### diario_status (enum):
`pendente` | `aprovado` | `rejeitado`

### Tabelas relacionadas:
- `diario_servicos` (`registro_id`, `descricao`, `etapa_id`, `composicao_id`, `percentual_adicionado`)
- `diario_fotos` (`registro_id`, `storage_path`, `legenda`)

---

## 9. Agenda

### Tabela: `obra_agenda`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ | auto |
| `obra_id` | uuid | 🔑 | ✅ | ✅ |
| `company_id` | uuid | 🔑 | - | - |
| `titulo` | text | 🔑 | ✅ | ✅ |
| `data_programada` | date | - | ✅ | ✅ |
| `hora_programada` | text | - | ✅ | ✅ |
| `tipo` | text | - | ✅ | ✅ |
| `descricao` | text | - | ✅ | ✅ |
| `status` | text | - | ✅ | ✅ |
| `responsavel` | text | - | ✅ | ✅ |
| `prioridade` | text | 🔑 | ✅ | ✅ |
| `local` | text | - | ✅ | ✅ |
| `alerta_ativo` | boolean | 🔑 | ✅ | ✅ |
| `antecedencia_alerta_em_dias` | int | - | ✅ | ✅ |
| `data_finalizacao` | timestamptz | - | ✅ | ✅ |
| `data_limite` | date | - | ✅ | ✅ |
| `origem` | text | - | ✅ | ✅ |

### Tipo válidos (frontend):
`execucao` | `entrega_material` | `instalacao` | `vistoria` | `ensaio` |
`reuniao` | `medicao` | `administrativo` | `fornecedor` | `pendencia` | `outro`

### Status válidos (frontend):
`programado` | `confirmado` | `em_andamento` | `concluido` | `atrasado` | `cancelado`

### Prioridade válidos:
`baixa` | `media` | `alta`

---

## 10. Pendências ⚠️ TABELA NÃO EXISTE

### 🚫 Tabela `pendencias` NÃO EXISTE no banco!

O frontend (`PendenciasPage.tsx`) faz CRUD completo numa tabela `pendencias`
que **não foi criada** no schema do Supabase.

**Campos esperados pelo frontend:**

| Campo | Tipo esperado |
|-------|--------------|
| `id` | uuid |
| `obra_id` | uuid |
| `titulo` | text NOT NULL |
| `descricao` | text |
| `tipo` | text (`documento`, `custo`, `pagamento`, `diario`, `orcamento`) |
| `prioridade` | text (`baixa`, `media`, `alta`) |
| `status` | text (`aberta`, `em_andamento`, `resolvida`) |
| `data_limite` | date |
| `observacao_interna` | text |
| `created_at` | timestamptz |

> **Bloqueio**: Não é possível seedar pendências sem criar a tabela primeiro.
> Requer migration `CREATE TABLE pendencias (...)`.

---

## 11. Fornecedores

### Tabela: `fornecedores`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ | auto |
| `obra_id` | uuid | 🔑 | ✅ | ✅ |
| `company_id` | uuid | - | - | ✅ |
| `nome` | text | 🔑 | ✅ | ✅ |
| `cnpj` | text | - | ✅ | ✅ |
| `telefone` | text | - | ✅ | ✅ |
| `email` | text | - | ✅ | ✅ |
| `cidade` | text | - | ✅ | ✅ |
| `observacoes` | text | - | ✅ | ✅ |
| `especialidades` | text[] | - | ✅ | ✅ |
| `contato` | text | - | - | - |
| `categoria` | text | - | - | - |

---

## 12. Documentos da Obra ⚠️ DISCREPÂNCIA CRÍTICA

### Tabela: `documentos_obra`

| Campo DB | Tipo | Frontend espera | ⚠️ Discrepância |
|----------|------|-----------------|-----------------|
| `id` | uuid | ✅ `id` | |
| `company_id` | uuid | ✅ | |
| `obra_id` | uuid | ✅ | |
| `nome` | text | ✅ | |
| `tipo` | text | - | DB tem `tipo` mas frontend não lê |
| `categoria` | text | ✅ | |
| `url_arquivo` | text | ⚠️ Frontend grava `arquivo_url` | **Nome diferente!** |
| `arquivo_nome` | text | ⚠️ Frontend lê `arquivo_nome` | Existe no DB ✅ |
| `url` | text | - | DB tem campo extra `url` |
| `tamanho` | bigint | ⚠️ Frontend grava `tamanho_bytes` | **Nome diferente!** |
| `observacoes` | text | ⚠️ Frontend grava `descricao` | **Campo diferente!** |
| `data_documento` | date | - | não usado |
| `validade` | date | - | não usado |
| `emitente` | text | - | não usado |

**Frontend grava campos que NÃO existem no schema:**
- `arquivo_url` → DB tem `url_arquivo`
- `arquivo_tipo` → DB NÃO tem este campo
- `tamanho_bytes` → DB tem `tamanho`
- `descricao` → DB tem `observacoes`
- `created_by` → DB NÃO tem este campo

> **Impacto**: Inserts do frontend provavelmente falham silenciosamente
> ou são ignorados pelo PostgREST. Requer investigação.

---

## 13. Contatos

### Tabela: `contatos`

| Campo DB | Tipo | NOT NULL | Frontend lê | Frontend grava |
|----------|------|----------|-------------|----------------|
| `id` | uuid | 🔑 | ✅ | auto |
| `company_id` | uuid | 🔑 | ✅ | ✅ |
| `nome` | text | 🔑 | ✅ | ✅ |
| `tipo` | enum `tipo_contato` | 🔑 | ✅ | ✅ |
| `empresa` | text | - | ✅ | ✅ |
| `especialidade` | text | - | ✅ | ✅ |
| `telefone` | text | - | ✅ | ✅ |
| `whatsapp` | text | - | ✅ | ✅ |
| `email` | text | - | ✅ | ✅ |
| `website` | text | - | ✅ | ✅ |
| `cidade` | text | - | ✅ | ✅ |
| `cnpj` | text | - | ✅ | ✅ |
| `tags` | text[] | - | ✅ | ✅ |
| `observacoes` | text | - | ✅ | ✅ |
| `obra_ids` | uuid[] | - | ✅ | ✅ |

### tipo_contato (enum):
`cliente` | `fornecedor_material` | `mao_de_obra` | `parceiro` | `projetista` | `outro`

> **Nota**: Contatos são vinculados a `company_id`, não a `obra_id`.
> Não requer obra demo específica.

---

## 14. Links Públicos

### Tabela: `obra_links`

| Campo DB | Tipo | NOT NULL | Frontend lê |
|----------|------|----------|-------------|
| `id` | uuid | 🔑 | ✅ |
| `token` | text | 🔑 | ✅ (auto-generated) |
| `obra_id` | uuid | 🔑 | ✅ |
| `company_id` | uuid | 🔑 | ✅ |
| `tipo` | enum `tipo_link` | 🔑 | ✅ |
| `nome_label` | text | 🔑 | ✅ |
| `permissoes` | jsonb | 🔑 | ✅ |
| `permite_estoque` | boolean | 🔑 | ✅ |
| `ativo` | boolean | 🔑 | ✅ |
| `last_accessed_at` | timestamptz | - | ✅ |

---

## Sumário de Bloqueios e Riscos

### 🚫 Bloqueios (impedem seed)

| # | Módulo | Problema | Ação necessária |
|---|--------|----------|-----------------|
| B1 | Pendências | Tabela `pendencias` **não existe** | Criar migration |
| B2 | Documentos | Frontend grava campos inexistentes (`arquivo_url`, `arquivo_tipo`, `tamanho_bytes`, `created_by`) | Alinhar schema ou frontend |

### ⚠️ Riscos (podem causar dados incorretos)

| # | Módulo | Problema | Mitigação |
|---|--------|----------|-----------|
| R1 | Pagamentos | Frontend auto-marca `atrasado` | Usar datas futuras ou status `pago` |
| R2 | Recebíveis | `statusDinamico` é calculado no frontend | Seed `data_vencimento` futuro |
| R3 | Agenda | `company_id` é NOT NULL | Incluir company_id no seed |
| R4 | Documentos | `descricao` frontend → `observacoes` DB | Campo provavelmente nunca persiste |

### ✅ Módulos prontos para seed (sem bloqueios)

1. ✅ Pagamentos (7 campos NOT NULL)
2. ✅ Recebíveis (5 campos NOT NULL)
3. ✅ Custo Real (3 campos NOT NULL)
4. ✅ Contratos (10 campos NOT NULL)
5. ✅ Contratos Medições (5 campos NOT NULL)
6. ✅ Cronograma Tarefas (1 campo NOT NULL)
7. ✅ Cronograma Dependências (0 campos NOT NULL)
8. ✅ Diário de Obra (5 campos NOT NULL)
9. ✅ Agenda (4 campos NOT NULL)
10. ✅ Fornecedores (2 campos NOT NULL)
11. ✅ Contatos (3 campos NOT NULL)
12. ✅ Links Públicos (7 campos NOT NULL)
13. 🚫 Pendências → requer migration
14. ⚠️ Documentos → requer alinhamento schema

---

## Ordem Recomendada de Seed

```
1. Fornecedores       (pré-requisito de Pagamentos)
2. Cronograma Tarefas (+ Dependências)
3. Pagamentos         (+ vínculo etapa_orcamento)
4. Custo Real         (vinculado a etapas)
5. Recebíveis         (vinculado a contratos)
6. Contratos          (+ Medições)
7. Diário de Obra     (+ Servicos + Fotos)
8. Agenda             (+ referências cruzadas)
9. Contatos
10. Links Públicos
```

> **Pendências e Documentos**: resolver bloqueios primeiro (B1 e B2).
