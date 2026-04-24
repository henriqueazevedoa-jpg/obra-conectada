-- ================================================================
-- SEED ORÇAMENTO — dados realistas para as 3 obras base
-- Executar APÓS seed_base.sql
-- ================================================================

-- Limpar dados anteriores das obras de teste
DELETE FROM orcamento_subitens   WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001';
DELETE FROM orcamento_composicoes WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001';
DELETE FROM orcamento_categorias  WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001';
DELETE FROM orcamento_versoes     WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001';
DELETE FROM precos_fornecedores   WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001';
DELETE FROM contatos WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND id IN (
    'f1000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000003'
  );

-- ── FORNECEDORES BASE ────────────────────────────────────────
INSERT INTO contatos (id, company_id, nome, email, telefone, tipo, created_at)
VALUES
  ('f1000000-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Aço Center Distribuidora', 'contato@acocenter.com.br', '(11) 3322-4455', 'fornecedor_material', now()),
  ('f1000000-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Concremax Concreto', 'vendas@concremax.com.br', '(11) 4455-6677', 'fornecedor_material', now()),
  ('f1000000-0000-0000-0000-000000000003',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'MetalPro Estruturas', 'comercial@metalpro.com.br', '(11) 5544-3322', 'fornecedor_material', now())
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- OBRA 1 — Residência Vila Nova
-- Estágio: orçamento parcialmente cotado (3 cotadas, 2 sem preço)
-- Total esperado: R$ 468.720,00
-- ================================================================

INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, origem, created_at, updated_at)
VALUES ('b1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'v1.0', 'analitico', 'rascunho', 468720.00, 'manual', now(), now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, created_at, updated_at)
VALUES
  ('e1100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '01', 'Serviços Preliminares', 9360.00,  true, now(), now()),
  ('e1100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '02', 'Fundações',              46800.00, true, now(), now()),
  ('e1100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '03', 'Estrutura',              79560.00, true, now(), now()),
  ('e1100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '04', 'Instalações Elétricas', 42185.00, true, now(), now()),
  ('e1100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '05', 'Revestimentos e Pisos', 60840.00, true, now(), now()),
  ('e1100000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '06', 'Cobertura',             32760.00, true, now(), now()),
  ('e1100000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '07', 'Pintura',               23415.00, true, now(), now());

INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, tipo, tipo_item, fonte_referencia, created_at, updated_at)
VALUES
  -- Serviços Preliminares (cotados)
  ('c1100000-0000-0000-0000-000000000001', 'e1100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Limpeza e preparo do terreno', 'M²',  180, 18.00,   3240.00, false, 'composicao', 'servico', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000002', 'e1100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Locação da obra',              'VB',    1, 2800.00, 2800.00, false, 'composicao', 'servico', 'manual', now(), now()),
  -- Fundações (parcialmente cotadas)
  ('c1100000-0000-0000-0000-000000000003', 'e1100000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Escavação manual',             'M³',   45, 62.00,   2790.00, false, 'composicao', 'mao_obra',  'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000004', 'e1100000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Sapata de concreto armado',    'M³',   18, 980.00, 17640.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000005', 'e1100000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '02.03', 'Viga baldrame concreto',       'M³',   12, 0.00,       0.00, false, 'composicao', 'material', 'manual', now(), now()),
  -- Estrutura (sem preço — para aparecer no KPI)
  ('c1100000-0000-0000-0000-000000000006', 'e1100000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Pilares concreto armado',      'M³',   14, 0.00,       0.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000007', 'e1100000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '03.02', 'Vigas e laje concreto',        'M³',   28, 1380.00, 38640.00, false, 'composicao', 'material', 'manual', now(), now()),
  -- Instalações Elétricas
  ('c1100000-0000-0000-0000-000000000008', 'e1100000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', '04.01', 'Eletrodutos e fiação geral',   'VB',    1, 18500.00,18500.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000009', 'e1100000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', '04.02', 'Mão de obra elétrica',         'VB',    1, 23685.00,23685.00, false, 'composicao', 'mao_obra',  'manual', now(), now()),
  -- Revestimentos
  ('c1100000-0000-0000-0000-000000000010', 'e1100000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', '05.01', 'Piso porcelanato 60x60',       'M²',   85, 185.00, 15725.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000011', 'e1100000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', '05.02', 'Revestimento cerâmico',        'M²',   45, 120.00,  5400.00, false, 'composicao', 'material', 'manual', now(), now()),
  -- Cobertura
  ('c1100000-0000-0000-0000-000000000012', 'e1100000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001', '06.01', 'Estrutura de madeira',         'M²',  210, 85.00,  17850.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000013', 'e1100000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001', '06.02', 'Telha cerâmica francesa',      'M²',  210, 70.00,  14700.00, false, 'composicao', 'material', 'manual', now(), now()),
  -- Pintura
  ('c1100000-0000-0000-0000-000000000014', 'e1100000-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000001', '07.01', 'Pintura látex interna',        'M²',  420, 22.00,   9240.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c1100000-0000-0000-0000-000000000015', 'e1100000-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000001', '07.02', 'Pintura acrílica externa',     'M²',  280, 0.00,       0.00, false, 'composicao', 'material', 'manual', now(), now());

-- ================================================================
-- OBRA 2 — Edifício Comercial Alphaville
-- Estágio: orçamento completo, 100% cotado
-- Total esperado: R$ 3.124.800,00
-- ================================================================

INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, origem, created_at, updated_at)
VALUES ('b2000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'v2.0', 'analitico', 'rascunho', 3124800.00, 'manual', now(), now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, created_at, updated_at)
VALUES
  ('e2100000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '01', 'Serviços Preliminares',    78120.00, true, now(), now()),
  ('e2100000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '02', 'Fundações Profundas',     312480.00, true, now(), now()),
  ('e2100000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '03', 'Estrutura Concreto',      718704.00, true, now(), now()),
  ('e2100000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '04', 'Instalações Elétricas',   406224.00, true, now(), now()),
  ('e2100000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '05', 'Revestimentos e Pisos',   343728.00, true, now(), now()),
  ('e2100000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '06', 'Elevador',                187488.00, true, now(), now()),
  ('e2100000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '07', 'BDI e Administração',     312480.00, true, now(), now());

INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, tipo, tipo_item, fonte_referencia, created_at, updated_at)
VALUES
  ('c2100000-0000-0000-0000-000000000001', 'e2100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Canteiro de obras completo',      'VB',   1,  45000.00,  45000.00, false, 'composicao', 'servico', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000002', 'e2100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Locação e sondagem SPT',          'VB',   1,  18500.00,  18500.00, false, 'composicao', 'servico', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000003', 'e2100000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Estacas hélice contínua D=40cm', 'M',  480,   320.00, 153600.00, false, 'composicao', 'servico', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000004', 'e2100000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Pilares concreto armado fck30',   'M³',  95,  1480.00, 140600.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000005', 'e2100000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '03.02', 'Laje nervurada fck30',            'M²',1200,   280.00, 336000.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000006', 'e2100000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', '04.01', 'Subestação transformador 300kVA', 'VB',   1,  85000.00,  85000.00, false, 'composicao', 'equipamento', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000007', 'e2100000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', '04.02', 'Fiação e eletrodutos',            'VB',   1, 124000.00, 124000.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c2100000-0000-0000-0000-000000000008', 'e2100000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001', '06.01', 'Elevador comercial 8 pessoas',   'UN',   2,  93744.00, 187488.00, false, 'composicao', 'equipamento', 'manual', now(), now());

-- ================================================================
-- OBRA 3 — Galpão Industrial Cajamar
-- Estágio: orçamento aprovado, múltiplos fornecedores cotados
-- Total esperado: R$ 5.240.000,00
-- ================================================================

INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, origem, created_at, updated_at)
VALUES ('b3000000-0000-0000-0000-000000000001',
        'a3000000-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'v2.0', 'analitico', 'ativo', 5240000.00, 'manual', now(), now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, created_at, updated_at)
VALUES
  ('e3100000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '01', 'Serviços Preliminares',  104800.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '02', 'Terraplanagem',          209600.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '03', 'Fundações',              471600.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '04', 'Estrutura Metálica',    1572000.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '05', 'Cobertura e Fechamentos', 838400.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000006', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '06', 'Piso Industrial',        628800.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000007', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '07', 'Instalações e Docas',    471600.00, true, now(), now()),
  ('e3100000-0000-0000-0000-000000000008', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '08', 'BDI e Administração',    628800.00, true, now(), now());

INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, tipo, tipo_item, fonte_referencia, created_at, updated_at)
VALUES
  ('c3100000-0000-0000-0000-000000000001', 'e3100000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Corte e aterro mecanizado',          'M³', 8400,  18.00, 151200.00, false, 'composicao', 'servico', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000002', 'e3100000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Estacas hélice D=50cm L=14m',        'UN',   64,4800.00, 307200.00, false, 'composicao', 'servico', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000003', 'e3100000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', '04.01', 'Estrutura metálica pilares e vigas', 'KG',220000,   5.20,1144000.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000004', 'e3100000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', '04.02', 'Terças metálicas Z200',              'KG', 48000,   5.60, 268800.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000005', 'e3100000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', '05.01', 'Telha trapezoidal galvanizada',      'M²',  4800,  68.00, 326400.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000006', 'e3100000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001', '06.01', 'Piso concreto e=20cm armado fck30',  'M²',  4200, 120.00, 504000.00, false, 'composicao', 'material', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000007', 'e3100000-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000001', '07.01', 'Docas niveladoras hidráulicas',      'UN',     6,28000.00, 168000.00, false, 'composicao', 'equipamento', 'manual', now(), now()),
  ('c3100000-0000-0000-0000-000000000008', 'e3100000-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000001', '07.02', 'Instalações elétricas geral',        'VB',     1,185000.00,185000.00, false, 'composicao', 'material', 'manual', now(), now());

-- Preços de fornecedores para Obra 3 (múltiplas cotações)
INSERT INTO precos_fornecedores (id, company_id, obra_id, composicao_id, fornecedor_id, preco_unitario, observacao, created_at)
VALUES
  ('pf300000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'c3100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 5.20, 'SELECIONADO. Inclui pintura primer. Prazo: 45 dias.', now()),
  ('pf300000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'c3100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 5.65, 'Sem pintura inclusa. Prazo: 30 dias.', now()),
  ('pf300000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'c3100000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000002', 120.00, 'SELECIONADO. fck30 bombeado.', now())
ON CONFLICT (id) DO NOTHING;
