-- =====================================================
-- 00_preflight_schema.sql — Pré-voo de schema
-- Executar via MCP ANTES de qualquer seed de dados
-- Apenas SELECT — nunca INSERT/UPDATE/DELETE
-- =====================================================

-- 1. Colunas das tabelas principais
SELECT table_name, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    -- tabelas existentes
    'companies','profiles','obras','obra_memberships',
    'orcamento_versoes','orcamento_categorias',
    'orcamento_composicoes','orcamento_subitens',
    'cronograma_tarefas','cronograma_dependencias',
    'pagamentos','pagamento_itens','recebiveis',
    'contratos','contratos_medicoes',
    'diario_registros','diario_fotos','diario_servicos',
    'pendencias','pendencia_comentarios',
    'documentos','documento_versoes',
    'projeto_arquivos','projeto_chunks',
    -- tabelas novas do Intelligence (podem não existir ainda)
    'project_documents','project_document_pages',
    'project_page_zones','project_raw_extractions',
    'project_extraction_candidates','project_extracted_entities',
    'project_entity_observations','project_extracted_tables',
    'project_review_tasks','project_intelligence_outputs',
    'project_document_versions','project_entity_schemas'
  )
ORDER BY table_name, ordinal_position;

-- 2. Enums existentes
SELECT n.nspname, t.typname AS enum_name, e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY enum_name, e.enumsortorder;

-- 3. Check constraints
SELECT conrelid::regclass AS table_name, conname,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY table_name::text, conname;

-- 4. Foreign keys
SELECT tc.table_name, kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. Policies RLS
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Índices
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. Triggers
SELECT event_object_table AS table_name, trigger_name,
       action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. Functions/RPCs
SELECT p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
