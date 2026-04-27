# Relatório de Execução — Sprint Seed 02B

## Resumo
A limpeza controlada dos dados vinculados às 3 obras de demonstração (`a1...0001`, `a2...0002`, `a3...0003`) foi executada com **sucesso** no ambiente local via MCP Supabase.

Todos os registros atrelados às obras demo, em relações diretas e indiretas, foram expurgados de forma estruturada (bottom-up), garantindo a integridade dos dados compartilhados da conta (`companies`, `auth.users`, `profiles`).

**Total de registros removidos:** 1.397  
**Status final:** SUCESSO. Nenhuma falha de FK (Foreign Key constraint) ocorreu durante a execução da transação `BEGIN/COMMIT`.

---

## 1. Contagem de Registros — Antes da Limpeza (Before)

### Obras Raiz
- `obras`: 1

### Tabelas Diretas (Principais contagens encontradas)
- `projeto_paginas_raw`: 1179
- `processamento_custos`: 30
- `projeto_quantitativos`: 22
- `preco_historico`: 18
- `custo_real_itens`: 16
- `projeto_arquivos`: 12
- `pagamentos`: 12
- `cronograma_tarefas`: 8
- `fornecedores`: 8
- `projeto_chunks`: 6
- `recebiveis`: 6
- `notifications`: 5
- `orcamento_categorias`: 4
- `cotacao_lotes`: 3
- *(Demais tabelas com dados: contratos, contratos_escopo, contratos_medicoes, cotacao_precos, cronograma_dependencias, cronograma_versoes, orcamento_versoes)*

### Tabelas Indiretas (Via sub-queries de dependência)
- `orcamento_subitens`: 22
- `cotacao_lote_itens`: 12
- `cotacao_respostas`: 12
- `orcamento_composicoes`: 9
- `contratos_medicao_itens`: 1

---

## 2. Contagem de Registros — Após a Limpeza (After)

Após a execução do script `02_clean_demo_data.sql`, a bateria de scripts de validação de contagem foi executada novamente pelo MCP.

**Todas as 69 tabelas validadas retornaram exatamente `0` registros** para os escopos de `obra_id` das três obras alvo.

- `obras`: 0
- *Todas as tabelas com relação direta*: 0
- *Todas as tabelas com relação indireta*: 0

O ecossistema referencial foi completamente higienizado sem impacto colateral na conta Lastra principal.

---

## 3. Considerações e Próximos Passos
O database local está agora 100% livre do "lixo estrutural" das obras demo antigas. As `companies` e usuários de autenticação foram inteiramente preservados, o que era a prioridade.

**Atenção ao Storage:** Os arquivos físicos no bucket do Supabase referentes a esses dados **não foram apagados** via script SQL (conforme regra de segurança de não realizar DROPs massivos de storage no banco). Eles permanecem isolados sem apontamento no banco (soft orphaned).

O repositório está oficialmente limpo e **pronto para o Seed Demo Oficial**. A **Sprint Seed 03** pode prosseguir com foco em gerar os `INSERT`s limpos para criar as 3 obras e módulos de demonstração.
