# RLS-INTELLIGENCE-FIX-REPORT — Sprint 75C

## Data
2026-04-27

## Tabelas corrigidas

### processamento_custos
- Colunas encontradas: id (uuid PK), arquivo_id (uuid FK→projeto_arquivos), obra_id (uuid NOT NULL), company_id (uuid NOT NULL), fase (text), modelo (text), tokens_entrada (int), tokens_saida (int), unidades (int), custo_usd (numeric), created_at (timestamptz)
- Tinha company_id? **sim** (NOT NULL)
- Tinha obra_id? **sim** (NOT NULL)
- Estratégia de policy usada: **company_id direto** — `company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())`
- Policies criadas:
  - `company_isolation_select_processamento_custos` (SELECT)
  - `company_isolation_insert_processamento_custos` (INSERT)
  - `company_isolation_update_processamento_custos` (UPDATE)
- DELETE criado? **não** — motivo: Nenhuma evidência de DELETE no codebase. Worker (`main.py` L63) faz apenas INSERT. Frontend não interage com esta tabela.
- RLS habilitado: **sim**

### projeto_quantitativos
- Colunas encontradas: id (uuid PK), obra_id (uuid NOT NULL FK→obras), company_id (uuid NOT NULL), disciplina (text), tipo (text), dados (jsonb), fonte (text), confianca (text), conflitos (jsonb), versao_projeto (text), consolidado_em (timestamptz), created_at (timestamptz)
- Tinha company_id? **sim** (NOT NULL)
- Tinha obra_id? **sim** (NOT NULL)
- Estratégia de policy usada: **company_id direto** — `company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())`
- Policies criadas:
  - `company_isolation_select_projeto_quantitativos` (SELECT)
  - `company_isolation_insert_projeto_quantitativos` (INSERT)
  - `company_isolation_update_projeto_quantitativos` (UPDATE)
- DELETE criado? **não** — motivo: Nenhuma evidência de DELETE no codebase. Worker (`consolidador.py` L187) faz upsert. Frontend (`useQuantitativos.ts` L48-52) faz apenas SELECT.
- RLS habilitado: **sim**

## Resultado das queries de verificação

### Query 1 — RLS habilitado
```
processamento_custos   → rowsecurity = true ✅
projeto_quantitativos  → rowsecurity = true ✅
```

### Query 2 — Policies criadas
```
processamento_custos  | company_isolation_select_processamento_custos  | SELECT | USING(company_id IN (...auth.uid()...))
processamento_custos  | company_isolation_insert_processamento_custos  | INSERT | WITH CHECK(company_id IN (...auth.uid()...))
processamento_custos  | company_isolation_update_processamento_custos  | UPDATE | USING + WITH CHECK(company_id IN (...auth.uid()...))
projeto_quantitativos | company_isolation_select_projeto_quantitativos | SELECT | USING(company_id IN (...auth.uid()...))
projeto_quantitativos | company_isolation_insert_projeto_quantitativos | INSERT | WITH CHECK(company_id IN (...auth.uid()...))
projeto_quantitativos | company_isolation_update_projeto_quantitativos | UPDATE | USING + WITH CHECK(company_id IN (...auth.uid()...))
```
Nenhuma policy usa `USING (true)` ou `WITH CHECK (true)`. ✅

### Query 3 — Tabelas sensíveis sem RLS
```
[] (zero linhas) ✅
```

## Riscos restantes

1. **Worker usa service_role**: O Python worker insere via service_role key que bypassa RLS automaticamente. Isso é o comportamento esperado e correto — o worker precisa inserir sem autenticação de usuário. Porém, caso o worker receba um `company_id` incorreto no payload, o registro será inserido na empresa errada. O isolamento real no worker depende da integridade do payload.

2. **Sem policy DELETE**: Se no futuro for necessário que o frontend delete registros dessas tabelas, será preciso criar policies DELETE. Documentado como pendência futura.

## Confirmação
- Nenhuma outra tabela foi alterada nesta sprint.
- Nenhum arquivo frontend foi alterado.
- Nenhum arquivo do worker foi alterado.
- Migration aplicada: `enable_rls_intelligence_tables`
