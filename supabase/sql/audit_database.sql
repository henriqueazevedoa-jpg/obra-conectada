-- 1. Total tables
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 2. Policies
SELECT policyname, tablename, permissive, roles, cmd, qual, with_check 
FROM pg_policies WHERE schemaname = 'public';

-- 3. Functions / RPCs
SELECT proname, prosecdef FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public';

-- 4. Vector columns
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE udt_name = 'vector' AND table_schema = 'public';

-- 5. Sensitive tables without RLS or without company_id/obra_id
SELECT t.table_name,
       has_company_id,
       has_obra_id,
       has_rls
FROM (
    SELECT table_name,
           EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'company_id') as has_company_id,
           EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'obra_id') as has_obra_id
    FROM information_schema.tables t
    WHERE table_schema = 'public'
) t
JOIN pg_tables pt ON pt.tablename = t.table_name
WHERE pt.schemaname = 'public';
