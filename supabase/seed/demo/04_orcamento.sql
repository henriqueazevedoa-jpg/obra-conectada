-- =====================================================
-- 04_orcamento.sql — Seed de Orçamento Demo
-- Sprint Seed 04A — NÃO EXECUTAR NESTA SPRINT
-- =====================================================

BEGIN;

-- Safety guard
DO $$
DECLARE
  v_obras_count int;
BEGIN
  SELECT count(*) INTO v_obras_count FROM obras
  WHERE id IN (
    'a1000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000003'
  );
  IF v_obras_count <> 3 THEN
    RAISE EXCEPTION 'Obras demo não encontradas. Abortando seed de orçamento.';
  END IF;
END $$;

-- Limpeza prévia para idempotência das 3 obras demo
DELETE FROM orcamento_categorias WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003');

-- =====================================================
-- OBRA 1: Residência (~60%, enxuto)
-- =====================================================

-- Versão
INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, descricao, origem)
VALUES (
    'f1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'v1.0',
    'estimativo',
    'ativo',
    150000.00,
    'Orçamento Base Residência',
    'manual'::orcamento_origem
) ON CONFLICT (id) DO UPDATE SET valor_total = EXCLUDED.valor_total, updated_at = now();

-- Categorias (Obra 1)
INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, parent_id)
VALUES
    ('c1100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '01', 'Serviços Preliminares', 5000.00, true, NULL),
    ('c1200000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '02', 'Fundações', 35000.00, true, NULL),
    ('c1300000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '03', 'Estrutura', 60000.00, true, NULL),
    ('c1400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '04', 'Alvenaria e Fechamentos', 25000.00, true, NULL),
    ('c1500000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '05', 'Cobertura', 25000.00, true, NULL);

-- Composições (Obra 1)
INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, tipo, tipo_item)
VALUES
    ('d1110000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Limpeza do Terreno', 'm2', 200, 10.00, 2000.00, 'composicao', 'servico'),
    ('d1120000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Locação da Obra', 'm2', 150, 20.00, 3000.00, 'composicao', 'servico'),
    ('d1210000-0000-0000-0000-000000000001', 'c1200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Escavação manual', 'm3', 50, 100.00, 5000.00, 'composicao', 'servico'),
    ('d1220000-0000-0000-0000-000000000001', 'c1200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Concreto usinado FCK 25MPa', 'm3', 60, 500.00, 30000.00, 'insumo_direto', 'material'),
    ('d1310000-0000-0000-0000-000000000001', 'c1300000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Armação em aço CA-50', 'kg', 2000, 15.00, 30000.00, 'composicao', 'material'),
    ('d1320000-0000-0000-0000-000000000001', 'c1300000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.02', 'Laje pré-moldada', 'm2', 120, 250.00, 30000.00, 'composicao', 'material');

-- Subitens (Obra 1)
INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, descricao, nome, unidade, quantidade, preco_unitario, preco_total)
VALUES
    ('e1111000-0000-0000-0000-000000000001', 'd1110000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Servente de obras', 'Servente de obras', 'h', 80, 25.00, 2000.00),
    ('e1211000-0000-0000-0000-000000000001', 'd1210000-0000-0000-0000-000000000001', 'c1200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Ajudante especializado', 'Ajudante especializado', 'h', 200, 25.00, 5000.00);


-- =====================================================
-- OBRA 2: Reforma (100%, completo)
-- =====================================================

-- Versão
INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, descricao, origem)
VALUES (
    'f2000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'v2.0',
    'analitico',
    'ativo',
    85000.00,
    'Orçamento Reforma Apartamento',
    'importacao_excel'::orcamento_origem
) ON CONFLICT (id) DO UPDATE SET valor_total = EXCLUDED.valor_total, updated_at = now();

-- Categorias (Obra 2)
INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes)
VALUES
    ('c2100000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '01', 'Demolições', 10000.00, true),
    ('c2200000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '02', 'Revestimentos', 30000.00, true),
    ('c2300000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '03', 'Pintura', 15000.00, true),
    ('c2400000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '04', 'Elétrica', 15000.00, true),
    ('c2500000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '05', 'Hidráulica', 15000.00, true);

-- Composições (Obra 2)
INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, tipo, tipo_item, regime_mo)
VALUES
    ('d2110000-0000-0000-0000-000000000001', 'c2100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Demolição de piso', 'm2', 50, 100.00, 5000.00, 'composicao', 'servico', 'pj'),
    ('d2120000-0000-0000-0000-000000000001', 'c2100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Caçamba de entulho', 'un', 10, 500.00, 5000.00, 'insumo_direto', 'equipamento', NULL),
    ('d2210000-0000-0000-0000-000000000001', 'c2200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Piso porcelanato', 'm2', 50, 200.00, 10000.00, 'composicao', 'material', NULL),
    ('d2220000-0000-0000-0000-000000000001', 'c2200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Mão de obra assentamento', 'm2', 50, 400.00, 20000.00, 'composicao', 'mao_obra', 'mei'),
    ('d2310000-0000-0000-0000-000000000001', 'c2300000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Pintura acrílica', 'm2', 150, 100.00, 15000.00, 'composicao', 'servico', 'pj');

-- Subitens (Obra 2)
INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, descricao, nome, unidade, quantidade, preco_unitario, preco_total)
VALUES
    ('e2211000-0000-0000-0000-000000000001', 'd2210000-0000-0000-0000-000000000001', 'c2200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Porcelanato Portobello', 'Porcelanato Portobello', 'm2', 55, 100.00, 5500.00),
    ('e2212000-0000-0000-0000-000000000001', 'd2210000-0000-0000-0000-000000000001', 'c2200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Argamassa ACIII', 'Argamassa ACIII', 'sc', 30, 50.00, 1500.00),
    ('e2213000-0000-0000-0000-000000000001', 'd2210000-0000-0000-0000-000000000001', 'c2200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Rejunte', 'Rejunte', 'kg', 10, 300.00, 3000.00);


-- =====================================================
-- OBRA 3: Galpão (~15%, preliminar)
-- =====================================================

-- Versão
INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, descricao, origem)
VALUES (
    'f3000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'v1.0',
    'estimativo',
    'ativo',
    350000.00,
    'Estimativa Inicial',
    'calculadora_estimativa'::orcamento_origem
) ON CONFLICT (id) DO UPDATE SET valor_total = EXCLUDED.valor_total, updated_at = now();

-- Categorias (Obra 3)
INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes)
VALUES
    ('c3100000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', '01', 'Infraestrutura', 150000.00, true),
    ('c3200000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', '02', 'Superestrutura Metálica', 200000.00, true);

-- Composições (Obra 3)
INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, tipo, tipo_item)
VALUES
    ('d3110000-0000-0000-0000-000000000001', 'c3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Terraplanagem', 'm2', 1000, 50.00, 50000.00, 'composicao', 'servico'),
    ('d3120000-0000-0000-0000-000000000001', 'c3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Sapatas', 'm3', 50, 2000.00, 100000.00, 'composicao', 'servico'),
    ('d3210000-0000-0000-0000-000000000001', 'c3200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Pilares Metálicos', 'kg', 5000, 20.00, 100000.00, 'composicao', 'material'),
    ('d3220000-0000-0000-0000-000000000001', 'c3200000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Tesouras e Terças', 'kg', 5000, 20.00, 100000.00, 'composicao', 'material');


-- Validação final local (Verificação de massa)
DO $$
DECLARE
  v_cat int;
  v_comp int;
BEGIN
  SELECT count(*) INTO v_cat FROM orcamento_categorias WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003');
  SELECT count(*) INTO v_comp FROM orcamento_composicoes WHERE etapa_id IN (SELECT id FROM orcamento_categorias WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003'));
  
  IF v_cat < 10 THEN
    RAISE EXCEPTION 'Atenção: Número de categorias criadas (%), esperado mínimo 10', v_cat;
  END IF;
  
  IF v_comp < 15 THEN
    RAISE EXCEPTION 'Atenção: Número de composições criadas (%), esperado mínimo 15', v_comp;
  END IF;
END $$;

COMMIT;
