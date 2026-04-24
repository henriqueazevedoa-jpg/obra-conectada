-- ================================================================
-- SEED BASE — 3 obras com IDs fixos para testes determinísticos
-- Empresa: bbbbbbbb-0000-0000-0000-000000000001 (ObraFácil DEV)
-- ================================================================
-- Limpar obras de teste anteriores (não afeta outras empresas)
DELETE FROM obras WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001'
);

INSERT INTO obras (id, company_id, nome, status, tipo, area_construida, prazo_semanas, created_at, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Residência Vila Nova', 'em_andamento', 'residencial_unifamiliar',
   180, 52, now(), now()),

  ('a2000000-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Edifício Comercial Alphaville', 'em_andamento', 'comercial',
   1200, 78, now(), now()),

  ('a3000000-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Galpão Industrial Cajamar', 'em_andamento', 'industrial',
   4200, 36, now(), now())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  updated_at = now();
