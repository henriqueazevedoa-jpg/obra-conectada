-- =====================================================
-- 03_base_obras.sql — Base demo: company, profile, obras
-- Sprint Seed 03 — pode ser reexecutado (UPSERT)
-- =====================================================

BEGIN;

-- Safety guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM companies
    WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001'
  ) THEN
    RAISE NOTICE 'Company demo não encontrada — será criada.';
  END IF;
END $$;

-- 1. Company demo (UPSERT)
INSERT INTO companies (id, nome, status, created_at, updated_at)
VALUES (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'Construtora Demo Lastra',
    'ativo',
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET updated_at = now();

-- 2. Profile demo (UPSERT)
INSERT INTO profiles (user_id, nome, email, company_id, created_at, profissao)
VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Engenheiro Demo',
    'demo@lastra.app',
    'bbbbbbbb-0000-0000-0000-000000000001',
    now(),
    'Engenheiro Civil'
)
ON CONFLICT (user_id) DO UPDATE SET nome = EXCLUDED.nome, profissao = EXCLUDED.profissao;

-- 3. Obra 1 — Residência Alto da Serra (~60%, em_andamento)
INSERT INTO obras (id, company_id, nome, status, percentual_andamento, cliente, is_demo, tipo_implantacao, origem_dados)
VALUES (
    'a1000000-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'Residência Alto da Serra',
    'em_andamento',
    60,
    'Cliente A',
    true,
    'nova'::tipo_implantacao,
    'real'::origem_dados
)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, status = EXCLUDED.status, percentual_andamento = EXCLUDED.percentual_andamento;

-- 4. Obra 2 — Reforma Apartamento Jardim (concluída)
INSERT INTO obras (id, company_id, nome, status, percentual_andamento, cliente, is_demo, tipo_implantacao, origem_dados)
VALUES (
    'a2000000-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'Reforma Apartamento Jardim',
    'concluida',
    100,
    'Cliente B',
    true,
    'nova'::tipo_implantacao,
    'real'::origem_dados
)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, status = EXCLUDED.status, percentual_andamento = EXCLUDED.percentual_andamento;

-- 5. Obra 3 — Galpão Comercial Bragança (~15%)
INSERT INTO obras (id, company_id, nome, status, percentual_andamento, cliente, is_demo, tipo_implantacao, origem_dados)
VALUES (
    'a3000000-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'Galpão Comercial Bragança',
    'em_andamento',
    15,
    'Cliente C',
    true,
    'nova'::tipo_implantacao,
    'real'::origem_dados
)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, status = EXCLUDED.status, percentual_andamento = EXCLUDED.percentual_andamento;

-- 6. Memberships
INSERT INTO obra_memberships (obra_id, user_id, role, created_at)
VALUES 
    ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'gestor'::app_role, now()),
    ('a2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'gestor'::app_role, now()),
    ('a3000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'gestor'::app_role, now())
ON CONFLICT (obra_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Validação local
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM obras
  WHERE id IN (
    'a1000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000003'
  );
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Esperado 3 obras demo, encontrado %', v_count;
  END IF;
END $$;

COMMIT;
