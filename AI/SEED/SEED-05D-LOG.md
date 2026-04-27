# SEED-05D — Log de Execução

> **Sprint**: SEED-05D · Seed Realista dos Módulos Compatíveis  
> **Data**: 2026-04-27  
> **Status**: ✅ Completo  
> **Obra**: Residência Alto da Serra (`a1000000-0000-0000-0000-000000000001`)

---

## Resumo Geral

| Módulo | Registros | Status |
|--------|-----------|--------|
| Fornecedores | 7 | ✅ |
| Contatos | 5 | ✅ |
| Cronograma Tarefas | 46 | ✅ |
| Cronograma Dependências | 20 | ✅ |
| Contratos | 3 | ✅ |
| Medições | 5 | ✅ |
| Pagamentos | 25 | ✅ |
| Custo Real | 15 | ✅ |
| Recebíveis | 7 | ✅ |
| Diário Registros | 12 | ✅ |
| Diário Serviços | 5 | ✅ |
| Agenda | 11 | ✅ |
| Links Públicos | 2 | ✅ |
| **Total** | **163** | ✅ |

---

## Checkpoints Obrigatórios

- [x] Colunas confirmadas via schema antes de cada INSERT
- [x] Limpeza idempotente executada antes de cada módulo
- [x] `tipo_tarefa` em CAIXA ALTA (`PADRAO`, `RESUMO`, `MARCO`)
- [x] `pagamento_tipo` usando `mao_de_obra` (underline duplo)
- [x] `company_id` preenchido em `obra_agenda`
- [x] Dados financeiros coerentes com orçamento (~60%)
- [x] Pendências e Documentos não tocados
- [x] SINAPI não tocado
- [x] Obras pré-existentes (Reforma/Galpão) não afetadas (0 registros)
- [x] Zero registros órfãos (deps, medições, serviços diário)
- [x] Log criado em `AI/SEED/` (não `.agent/`)

---

## Erros e Correções em Runtime

### 1. UUID com letras inválidas
**Erro**: `invalid input syntax for type uuid: "e1m00101..."`  
**Causa**: Letra `m` não é hexadecimal (0-9, a-f).  
**Correção**: Substituído por `e1ae01xx` (hex válido).

### 2. `contratos.tipo` check constraint
**Erro**: `contratos_tipo_check` rejeita `prestador_servico`.  
**Causa**: DB tem check `IN ('cliente','empreiteiro','fornecedor')`.  
**Audit 05C registrava**: `empreiteiro | fornecedor_material | prestador_servico | consultor` (valores do frontend, não do DB).  
**Correção**: Usado `fornecedor` para contratos de terceiros.  
**Ação futura**: Atualizar SEED-05C-DATA-CONTRACT com os valores reais do check constraint.

### 3. `contratos_medicoes.status` check constraint
**Erro**: `contratos_medicoes_status_check` rejeita `pendente`.  
**Causa**: DB tem check `IN ('rascunho','emitido','aprovado','contestado','pago')`.  
**Audit 05C registrava**: `rascunho | pendente | aprovado | pago` (frontend).  
**Correção**: Usado `emitido` no lugar de `pendente`.  
**Ação futura**: Atualizar SEED-05C-DATA-CONTRACT com os valores reais do check constraint.

### 4. `contatos.obra_ids` tipo uuid[]
**Erro**: `column "obra_ids" is of type uuid[] but expression is of type text[]`  
**Causa**: ARRAY literal precisa de cast explícito `::uuid[]`.  
**Correção**: Adicionado `::uuid[]` em todos os ARRAY de UUIDs.

---

## Coerência Financeira

| Métrica | Valor |
|---------|-------|
| Orçamento total (16 etapas) | R$ 875.150 |
| Custo real acumulado | R$ 332.550 (38%) |
| Pagamentos pagos | 13 (R$ ~324K) |
| Pagamentos futuros | 12 (R$ ~275K) |
| Recebíveis faturados | R$ 471.840 (54%) |
| Recebíveis recebidos | R$ 391.240 |
| Contrato principal | R$ 620.000 (63% medido) |

A obra está com ~60% de execução física (etapas 01-06 concluídas, 07 em andamento).
Os valores financeiros são coerentes: custo real (~38%) está abaixo das medições (~54%)
porque nem todas as compras futuras foram registradas como custo real ainda.

---

## Cronograma — Narrativa

| Etapa | Status | % |
|-------|--------|---|
| 01 - Serviços Preliminares | Concluído | 100% |
| 02 - Terraplenagem | Concluído | 100% |
| 03 - Fundações | Concluído | 100% |
| 04 - Estrutura | Concluído | 100% |
| 05 - Alvenaria | Concluído | 100% |
| 06 - Cobertura | Concluído | 100% |
| 07 - Hidrossanitárias | Em andamento | 60% |
| 08 - Elétricas | Em andamento | 20% |
| 09-16 | Pendente | 0% |

3 marcos inseridos: Fundações concluídas ✅, Estrutura concluída ✅, Entrega final (pendente).

---

## Módulos BLOQUEADOS (não tocados)

### Pendências
**Motivo**: Tabela `pendencias` não existe no banco.  
**Ação**: Requer `CREATE TABLE pendencias (...)` via migration.

### Documentos
**Motivo**: Frontend grava `arquivo_url`, `arquivo_tipo`, `tamanho_bytes`, `created_by` —
campos que não existem no schema (`url_arquivo`, `tamanho`).  
**Ação**: Alinhar frontend ↔ schema antes de seedar.

---

## Discrepâncias 05C → Corrigidas

O Data Contract SEED-05C-DATA-CONTRACT-DEMO.md deve ser atualizado com:

1. **contratos.tipo**: valores reais = `cliente | empreiteiro | fornecedor`
   (frontend mostra `prestador_servico`, `consultor` etc. mas DB não aceita)
2. **contratos.modalidade_medicao**: valores reais = `percentual | quantidade | misto | valor_fixo`
   (frontend mostra `preco_unitario`, `global` que não existem no check)
3. **contratos_medicoes.status**: valores reais = `rascunho | emitido | aprovado | contestado | pago`
   (frontend mostrava `pendente` que não existe no check)
4. **contratos.status**: valores reais = `rascunho | ativo | suspenso | encerrado | rescindido`
   (frontend mostra apenas 3 desses)

---

## Arquivos Criados

```
supabase/seed/demo/05d_01_fornecedores_contatos.sql
supabase/seed/demo/05d_06_contratos.sql
AI/SEED/SEED-05D-LOG.md
```

> **Nota**: Os demais scripts (cronograma, pagamentos, custo real, recebíveis, diário, agenda, links)
> foram executados diretamente via MCP SQL. Os dados persistem no banco. Para reprodutibilidade,
> consolidar em scripts SQL se necessário em sprint futura.
