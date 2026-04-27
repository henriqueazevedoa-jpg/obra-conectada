-- audit_data_contract.sql
-- Sprint DATA-01 — Auditoria completa do contrato de dados do Lastra
-- Executar via MCP ou psql. Somente SELECT — zero escrita.

-- 1. Tabelas com RLS status
SELECT tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Tabelas sem company_id (risco multi-tenant)
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN (
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'company_id'
  )
ORDER BY t.table_name;

-- 3. Tabelas sem obra_id e sem company_id (globais)
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN (
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('obra_id','company_id')
  )
ORDER BY t.table_name;

-- 4. Tabelas com múltiplas FKs para a mesma tabela pai (risco PostgREST)
SELECT
  tc.table_name AS tabela_filha,
  ccu.table_name AS tabela_pai,
  COUNT(*) AS qtd_fks,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.column_name) AS colunas_fk
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
GROUP BY tc.table_name, ccu.table_name
HAVING COUNT(*) > 1
ORDER BY qtd_fks DESC, tc.table_name;

-- 5. FKs com delete_rule
SELECT
  tc.table_name AS tabela_filha,
  kcu.column_name AS coluna_fk,
  ccu.table_name AS tabela_pai,
  ccu.column_name AS coluna_pai,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 6. Enums
SELECT t.typname AS enum_name, e.enumlabel AS valor
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY enum_name, e.enumsortorder;

-- 7. Check constraints
SELECT conrelid::regclass AS tabela, conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- 8. Triggers
SELECT event_object_table AS tabela, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. Functions/RPCs
SELECT p.proname AS funcao, pg_get_function_arguments(p.oid) AS argumentos
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 10. RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 11. Tabelas com RLS desabilitado
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

-- 12. Colunas das tabelas críticas de orçamento
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'orcamento_categorias','orcamento_composicoes',
    'orcamento_subitens','orcamento_versoes',
    'cronograma_tarefas','cronograma_dependencias',
    'pagamentos','recebiveis','custo_real_itens',
    'projeto_arquivos','projeto_chunks','projeto_quantitativos',
    'processamento_custos'
  )
ORDER BY table_name, ordinal_position;

-- 13. Verificar se sinapi_preco existe em orcamento_composicoes
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orcamento_composicoes'
  AND column_name = 'sinapi_preco';
-- Se retornar vazio: campo não existe no schema mas é usado pelo frontend.

-- 14. Verificar se voice_inputs existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'voice_inputs';
-- Se retornar vazio: tabela acessada em useVoiceInput.ts mas inexistente.

-- 15. Subitens sem categoria_id (ficam invisíveis no fetch atual)
SELECT COUNT(*) AS subitens_sem_categoria
FROM orcamento_subitens
WHERE categoria_id IS NULL;

-- 16. Subitens sem nome e sem descricao (ficam sem texto na UI)
SELECT COUNT(*) AS subitens_sem_nome
FROM orcamento_subitens
WHERE (nome IS NULL OR nome = '') AND (descricao IS NULL OR descricao = '');

-- 17. Totais por obra (validação de consistência de totalizadores)
SELECT
  ov.obra_id,
  ov.valor_total AS versao_valor_total,
  SUM(oc.preco_total) AS soma_categorias,
  ov.valor_total - SUM(oc.preco_total) AS delta
FROM orcamento_versoes ov
LEFT JOIN orcamento_categorias oc
  ON oc.versao_id = ov.id AND oc.parent_id IS NULL
GROUP BY ov.id, ov.obra_id, ov.valor_total
ORDER BY ABS(ov.valor_total - COALESCE(SUM(oc.preco_total),0)) DESC;
