
-- ================================================================
-- SEED ORÇAMENTO E COTAÇÕES — GERADO AUTOMATICAMENTE
-- ================================================================

DELETE FROM cotacao_respostas WHERE lote_id IN (SELECT id FROM cotacao_lotes WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'));
DELETE FROM cotacao_lote_itens WHERE lote_id IN (SELECT id FROM cotacao_lotes WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'));
DELETE FROM cotacao_lotes WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001');

DELETE FROM orcamento_subitens WHERE composicao_id IN (SELECT id FROM orcamento_composicoes WHERE categoria_id IN (SELECT id FROM orcamento_categorias WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001')));
DELETE FROM orcamento_composicoes WHERE categoria_id IN (SELECT id FROM orcamento_categorias WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'));
DELETE FROM orcamento_categorias WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001');
DELETE FROM orcamento_versoes WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001');

DELETE FROM contatos WHERE email IN ('compras@depositosp.com.br', 'vendas@acoecia.com.br', 'eletricmax@email.com', 'hidrotech@email.com', 'madeiramix@email.com');

-- FORNECEDORES (inseridos em contatos)
INSERT INTO contatos (id, company_id, nome, tipo, email, telefone, created_at, updated_at) VALUES ('f1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 'fornecedor_material', 'compras@depositosp.com.br', '(11) 3333-1111', now(), now());
INSERT INTO contatos (id, company_id, nome, tipo, email, telefone, created_at, updated_at) VALUES ('f2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Aço & Cia Distribuidora', 'fornecedor_material', 'vendas@acoecia.com.br', '(11) 4444-2222', now(), now());
INSERT INTO contatos (id, company_id, nome, tipo, email, telefone, created_at, updated_at) VALUES ('f3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'ElétricMax Materiais Elétricos', 'fornecedor_material', 'eletricmax@email.com', '(11) 5555-3333', now(), now());
INSERT INTO contatos (id, company_id, nome, tipo, email, telefone, created_at, updated_at) VALUES ('f4000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'HidroTech Tubos e Conexões', 'fornecedor_material', 'hidrotech@email.com', '(11) 6666-4444', now(), now());
INSERT INTO contatos (id, company_id, nome, tipo, email, telefone, created_at, updated_at) VALUES ('f5000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'MadeiraMix Estruturas', 'fornecedor_material', 'madeiramix@email.com', '(11) 7777-5555', now(), now());

-- OBRA: Residência Vila Nova
INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, origem, created_at, updated_at)
VALUES ('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'v1.0', 'analitico', 'ativo', 280000, 'manual', now(), now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1010000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '01', 'Fundação', 35000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1010100-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Escavação manual de valas', 'UN', 1, 5000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1010101-0000-0000-0000-000000000001', 'c1010100-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Servente', 'h', 200, 22, 4400, 19.8, 3960, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1010102-0000-0000-0000-000000000001', 'c1010100-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Pá', 'un', 4, 70, 280, 63, 252, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1010103-0000-0000-0000-000000000001', 'c1010100-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Picareta', 'un', 4, 80, 320, 72, 288, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1010200-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Radier em concreto fck 20MPa', 'UN', 1, 30000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1010201-0000-0000-0000-000000000001', 'c1010200-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Concreto usinado fck20', 'm³', 40, 450, 18000, 405, 16200, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1010202-0000-0000-0000-000000000001', 'c1010200-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tela soldada Q138', 'm²', 140, 80, 11200, 72, 10080, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1010203-0000-0000-0000-000000000001', 'c1010200-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Espaçador plástico', 'un', 1000, 0.8, 800, 0.7200000000000001, 720, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1020000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '02', 'Estrutura', 60000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1020100-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Pilares em concreto armado fck 25MPa', 'UN', 1, 25000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020101-0000-0000-0000-000000000001', 'c1020100-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Concreto usinado fck25', 'm³', 15, 480, 7200, 432, 6480, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020102-0000-0000-0000-000000000001', 'c1020100-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Vergalhão CA-50 10mm', 'kg', 800, 10.5, 8400, 9.450000000000001, 7560, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020103-0000-0000-0000-000000000001', 'c1020100-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Forma de madeira', 'm²', 80, 110, 8800, 99, 7920, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020104-0000-0000-0000-000000000001', 'c1020100-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Arame recozido', 'kg', 20, 30, 600, 27, 540, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1020200-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Vigas e lajes', 'UN', 1, 35000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020201-0000-0000-0000-000000000001', 'c1020200-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Concreto usinado fck25', 'm³', 25, 480, 12000, 432, 10800, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020202-0000-0000-0000-000000000001', 'c1020200-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Vergalhão CA-50 12.5mm', 'kg', 1200, 10.5, 12600, 9.450000000000001, 11340, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020203-0000-0000-0000-000000000001', 'c1020200-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Escoramento metálico', 'm²', 120, 60, 7200, 54, 6480, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1020204-0000-0000-0000-000000000001', 'c1020200-0000-0000-0000-000000000001', 'b1020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Forma de madeira', 'm²', 30, 110, 3300, 99, 2970, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1030000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '03', 'Alvenaria', 40000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1030100-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Alvenaria de vedação tijolo cerâmico 9x19x29', 'UN', 1, 35000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1030101-0000-0000-0000-000000000001', 'c1030100-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tijolo cerâmico 9x19x29', 'un', 8000, 1.2, 9600, 1.08, 8640, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1030102-0000-0000-0000-000000000001', 'c1030100-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Argamassa traço 1:2:8', 'm³', 5, 500, 2500, 450, 2250, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1030103-0000-0000-0000-000000000001', 'c1030100-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Pedreiro', 'h', 400, 35, 14000, 31.5, 12600, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1030104-0000-0000-0000-000000000001', 'c1030100-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Servente', 'h', 400, 22, 8800, 19.8, 7920, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1030200-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.02', 'Vergas e contravergas', 'UN', 1, 5000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1030201-0000-0000-0000-000000000001', 'c1030200-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Concreto fck 15MPa', 'm³', 5, 420, 2100, 378, 1890, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1030202-0000-0000-0000-000000000001', 'c1030200-0000-0000-0000-000000000001', 'b1030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Vergalhão CA-50 6.3mm', 'kg', 200, 14.5, 2900, 13.05, 2610, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1040000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '04', 'Cobertura', 35000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1040100-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '04.01', 'Estrutura de madeira para telhado', 'UN', 1, 15000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040101-0000-0000-0000-000000000001', 'c1040100-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Caibro 6x6cm pinus', 'm', 200, 12, 2400, 10.8, 2160, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040102-0000-0000-0000-000000000001', 'c1040100-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Ripa 2.5x5cm pinus', 'm', 400, 6, 2400, 5.4, 2160, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040103-0000-0000-0000-000000000001', 'c1040100-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Viga 6x12cm pinus', 'm', 80, 35, 2800, 31.5, 2520, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040104-0000-0000-0000-000000000001', 'c1040100-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Prego 18x27', 'kg', 15, 25, 375, 22.5, 337.5, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1040200-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '04.02', 'Telha cerâmica portuguesa', 'UN', 1, 20000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040201-0000-0000-0000-000000000001', 'c1040200-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Telha cerâmica portuguesa', 'un', 2500, 3.5, 8750, 3.15, 7875, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040202-0000-0000-0000-000000000001', 'c1040200-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Cumeeira cerâmica', 'un', 50, 8, 400, 7.2, 360, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1040203-0000-0000-0000-000000000001', 'c1040200-0000-0000-0000-000000000001', 'b1040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Argamassa de assentamento', 'kg', 150, 1.5, 225, 1.35, 202.5, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1050000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '05', 'Revestimentos', 45000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1050100-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '05.01', 'Chapisco e emboço interno', 'UN', 1, 20000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050101-0000-0000-0000-000000000001', 'c1050100-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Cimento CP-II 50kg', 'sc', 60, 38, 2280, 34.2, 2052, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050102-0000-0000-0000-000000000001', 'c1050100-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Areia média lavada', 'm³', 15, 180, 2700, 162, 2430, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050103-0000-0000-0000-000000000001', 'c1050100-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Cal hidratada', 'sc', 40, 25, 1000, 22.5, 900, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050104-0000-0000-0000-000000000001', 'c1050100-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Pedreiro', 'h', 200, 35, 7000, 31.5, 6300, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050105-0000-0000-0000-000000000001', 'c1050100-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Servente', 'h', 200, 22, 4400, 19.8, 3960, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1050200-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '05.02', 'Cerâmica para piso interno 45x45', 'UN', 1, 25000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050201-0000-0000-0000-000000000001', 'c1050200-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Cerâmica 45x45 esmaltada', 'm²', 130, 65, 8450, 58.5, 7605, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050202-0000-0000-0000-000000000001', 'c1050200-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Argamassa colante AC-I', 'sc', 30, 28, 840, 25.2, 756, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050203-0000-0000-0000-000000000001', 'c1050200-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Rejunte branco', 'kg', 25, 15, 375, 13.5, 337.5, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1050204-0000-0000-0000-000000000001', 'c1050200-0000-0000-0000-000000000001', 'b1050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Pedreiro', 'h', 150, 35, 5250, 31.5, 4725, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1060000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '06', 'Instalações Elétricas', 25000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1060100-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '06.01', 'Eletrodutos e fiação', 'UN', 1, 15000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060101-0000-0000-0000-000000000001', 'c1060100-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Eletroduto corrugado 25mm', 'm', 300, 4.5, 1350, 4.05, 1215, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060102-0000-0000-0000-000000000001', 'c1060100-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Fio 2.5mm²', 'm', 800, 2.8, 2240, 2.52, 2016, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060103-0000-0000-0000-000000000001', 'c1060100-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Fio 4mm²', 'm', 300, 4.2, 1260, 3.7800000000000002, 1134, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060104-0000-0000-0000-000000000001', 'c1060100-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Caixa de passagem', 'un', 60, 8, 480, 7.2, 432, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1060200-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '06.02', 'Quadro de distribuição e disjuntores', 'UN', 1, 10000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060201-0000-0000-0000-000000000001', 'c1060200-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Quadro 12 disjuntores', 'un', 1, 250, 250, 225, 225, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060202-0000-0000-0000-000000000001', 'c1060200-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Disjuntor monopolar 16A', 'un', 8, 25, 200, 22.5, 180, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060203-0000-0000-0000-000000000001', 'c1060200-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Disjuntor bipolar 40A', 'un', 1, 85, 85, 76.5, 76.5, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1060204-0000-0000-0000-000000000001', 'c1060200-0000-0000-0000-000000000001', 'b1060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Eletricista', 'h', 80, 45, 3600, 40.5, 3240, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1070000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '07', 'Instalações Hidráulicas', 20000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1070100-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '07.01', 'Tubulação de água fria PVC', 'UN', 1, 12000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070101-0000-0000-0000-000000000001', 'c1070100-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tubo PVC 25mm', 'm', 80, 12, 960, 10.8, 864, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070102-0000-0000-0000-000000000001', 'c1070100-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tubo PVC 32mm', 'm', 30, 18, 540, 16.2, 486, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070103-0000-0000-0000-000000000001', 'c1070100-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Joelho 90° 25mm', 'un', 40, 3.5, 140, 3.15, 126, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070104-0000-0000-0000-000000000001', 'c1070100-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Registro de gaveta 25mm', 'un', 4, 65, 260, 58.5, 234, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1070200-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '07.02', 'Tubulação de esgoto PVC', 'UN', 1, 8000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070201-0000-0000-0000-000000000001', 'c1070200-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tubo PVC esgoto 100mm', 'm', 40, 35, 1400, 31.5, 1260, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070202-0000-0000-0000-000000000001', 'c1070200-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tubo PVC esgoto 75mm', 'm', 20, 25, 500, 22.5, 450, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070203-0000-0000-0000-000000000001', 'c1070200-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Joelho 45° 100mm', 'un', 15, 18, 270, 16.2, 243, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1070204-0000-0000-0000-000000000001', 'c1070200-0000-0000-0000-000000000001', 'b1070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Caixa sifonada', 'un', 6, 45, 270, 40.5, 243, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b1080000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '08', 'Pintura', 20000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1080100-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '08.01', 'Massa corrida PVA interna', 'UN', 1, 8000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080101-0000-0000-0000-000000000001', 'c1080100-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Massa corrida PVA 25kg', 'gl', 8, 85, 680, 76.5, 612, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080102-0000-0000-0000-000000000001', 'c1080100-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lixa 120', 'un', 40, 2, 80, 1.8, 72, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080103-0000-0000-0000-000000000001', 'c1080100-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Selador acrílico', 'gl', 3, 110, 330, 99, 297, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080104-0000-0000-0000-000000000001', 'c1080100-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Pintor', 'h', 100, 35, 3500, 31.5, 3150, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c1080200-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '08.02', 'Tinta acrílica acabamento interno', 'UN', 1, 12000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080201-0000-0000-0000-000000000001', 'c1080200-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tinta acrílica premium 18L', 'gl', 5, 380, 1900, 342, 1710, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080202-0000-0000-0000-000000000001', 'c1080200-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Rolo lã 23cm', 'un', 4, 35, 140, 31.5, 126, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080203-0000-0000-0000-000000000001', 'c1080200-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Bandeja plástica', 'un', 2, 15, 30, 13.5, 27, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d1080204-0000-0000-0000-000000000001', 'c1080200-0000-0000-0000-000000000001', 'b1080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Pintor', 'h', 150, 35, 5250, 31.5, 4725, now());

-- OBRA: Edifício Comercial Alphaville
INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, origem, created_at, updated_at)
VALUES ('e2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'v1.0', 'analitico', 'ativo', 850000, 'manual', now(), now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2010000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '01', 'Fundação', 80000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2010100-0000-0000-0000-000000000001', 'b2010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Estacas raiz', 'UN', 1, 40000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2010101-0000-0000-0000-000000000001', 'c2010100-0000-0000-0000-000000000001', 'b2010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Estaca 1.1', 'UN', 10, 2000, 20000, 1800, 18000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2010102-0000-0000-0000-000000000001', 'c2010100-0000-0000-0000-000000000001', 'b2010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Estaca 1.2', 'm²', 10, 2000, 20000, 1800, 18000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2010200-0000-0000-0000-000000000001', 'b2010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Blocos de coroamento', 'UN', 1, 40000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2010201-0000-0000-0000-000000000001', 'c2010200-0000-0000-0000-000000000001', 'b2010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Estaca 2.1', 'UN', 10, 2000, 20000, 1800, 18000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2010202-0000-0000-0000-000000000001', 'c2010200-0000-0000-0000-000000000001', 'b2010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Estaca 2.2', 'm²', 10, 2000, 20000, 1800, 18000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2020000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '02', 'Estrutura', 120000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2020100-0000-0000-0000-000000000001', 'b2020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Pilares protendidos', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2020101-0000-0000-0000-000000000001', 'c2020100-0000-0000-0000-000000000001', 'b2020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Protendido 1.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2020102-0000-0000-0000-000000000001', 'c2020100-0000-0000-0000-000000000001', 'b2020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Protendido 1.2', 'm²', 10, 3000, 30000, 2700, 27000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2020200-0000-0000-0000-000000000001', 'b2020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Lajes protendidas', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2020201-0000-0000-0000-000000000001', 'c2020200-0000-0000-0000-000000000001', 'b2020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Protendido 2.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2020202-0000-0000-0000-000000000001', 'c2020200-0000-0000-0000-000000000001', 'b2020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Protendido 2.2', 'm²', 10, 3000, 30000, 2700, 27000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2030000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '03', 'Fachada', 140000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2030100-0000-0000-0000-000000000001', 'b2030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Revestimento ACM', 'UN', 1, 70000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2030101-0000-0000-0000-000000000001', 'c2030100-0000-0000-0000-000000000001', 'b2030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Fachada 1.1', 'UN', 10, 3500, 35000, 3150, 31500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2030102-0000-0000-0000-000000000001', 'c2030100-0000-0000-0000-000000000001', 'b2030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Fachada 1.2', 'm²', 10, 3500, 35000, 3150, 31500, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2030200-0000-0000-0000-000000000001', 'b2030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.02', 'Pele de vidro', 'UN', 1, 70000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2030201-0000-0000-0000-000000000001', 'c2030200-0000-0000-0000-000000000001', 'b2030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Fachada 2.1', 'UN', 10, 3500, 35000, 3150, 31500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2030202-0000-0000-0000-000000000001', 'c2030200-0000-0000-0000-000000000001', 'b2030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Fachada 2.2', 'm²', 10, 3500, 35000, 3150, 31500, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2040000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '04', 'Cobertura', 100000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2040100-0000-0000-0000-000000000001', 'b2040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '04.01', 'Estrutura metálica cobertura', 'UN', 1, 50000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2040101-0000-0000-0000-000000000001', 'c2040100-0000-0000-0000-000000000001', 'b2040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Cobertura 1.1', 'UN', 10, 2500, 25000, 2250, 22500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2040102-0000-0000-0000-000000000001', 'c2040100-0000-0000-0000-000000000001', 'b2040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Cobertura 1.2', 'm²', 10, 2500, 25000, 2250, 22500, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2040200-0000-0000-0000-000000000001', 'b2040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '04.02', 'Telha termoacústica', 'UN', 1, 50000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2040201-0000-0000-0000-000000000001', 'c2040200-0000-0000-0000-000000000001', 'b2040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Cobertura 2.1', 'UN', 10, 2500, 25000, 2250, 22500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2040202-0000-0000-0000-000000000001', 'c2040200-0000-0000-0000-000000000001', 'b2040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Cobertura 2.2', 'm²', 10, 2500, 25000, 2250, 22500, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2050000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '05', 'Revestimentos', 120000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2050100-0000-0000-0000-000000000001', 'b2050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '05.01', 'Porcelanato áreas comuns', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2050101-0000-0000-0000-000000000001', 'c2050100-0000-0000-0000-000000000001', 'b2050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Porcelanato 1.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2050102-0000-0000-0000-000000000001', 'c2050100-0000-0000-0000-000000000001', 'b2050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Porcelanato 1.2', 'm²', 10, 3000, 30000, 2700, 27000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2050200-0000-0000-0000-000000000001', 'b2050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '05.02', 'Granito escadas', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2050201-0000-0000-0000-000000000001', 'c2050200-0000-0000-0000-000000000001', 'b2050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Porcelanato 2.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2050202-0000-0000-0000-000000000001', 'c2050200-0000-0000-0000-000000000001', 'b2050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Porcelanato 2.2', 'm²', 10, 3000, 30000, 2700, 27000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2060000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '06', 'Elétrica', 110000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2060100-0000-0000-0000-000000000001', 'b2060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '06.01', 'QGBT e cabos alimentadores', 'UN', 1, 55000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2060101-0000-0000-0000-000000000001', 'c2060100-0000-0000-0000-000000000001', 'b2060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Elétrica 1.1', 'UN', 10, 2750, 27500, 2475, 24750, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2060102-0000-0000-0000-000000000001', 'c2060100-0000-0000-0000-000000000001', 'b2060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Elétrica 1.2', 'm²', 10, 2750, 27500, 2475, 24750, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2060200-0000-0000-0000-000000000001', 'b2060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '06.02', 'SPDA e aterramento', 'UN', 1, 55000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2060201-0000-0000-0000-000000000001', 'c2060200-0000-0000-0000-000000000001', 'b2060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Elétrica 2.1', 'UN', 10, 2750, 27500, 2475, 24750, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2060202-0000-0000-0000-000000000001', 'c2060200-0000-0000-0000-000000000001', 'b2060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Elétrica 2.2', 'm²', 10, 2750, 27500, 2475, 24750, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2070000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '07', 'Hidráulica', 90000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2070100-0000-0000-0000-000000000001', 'b2070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '07.01', 'Sistema de bombas', 'UN', 1, 45000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2070101-0000-0000-0000-000000000001', 'c2070100-0000-0000-0000-000000000001', 'b2070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Hidráulica 1.1', 'UN', 10, 2250, 22500, 2025, 20250, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2070102-0000-0000-0000-000000000001', 'c2070100-0000-0000-0000-000000000001', 'b2070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Hidráulica 1.2', 'm²', 10, 2250, 22500, 2025, 20250, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2070200-0000-0000-0000-000000000001', 'b2070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '07.02', 'Reservatórios', 'UN', 1, 45000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2070201-0000-0000-0000-000000000001', 'c2070200-0000-0000-0000-000000000001', 'b2070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Hidráulica 2.1', 'UN', 10, 2250, 22500, 2025, 20250, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2070202-0000-0000-0000-000000000001', 'c2070200-0000-0000-0000-000000000001', 'b2070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Hidráulica 2.2', 'm²', 10, 2250, 22500, 2025, 20250, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b2080000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '08', 'Pintura', 90000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2080100-0000-0000-0000-000000000001', 'b2080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '08.01', 'Pintura epóxi garagem', 'UN', 1, 45000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2080101-0000-0000-0000-000000000001', 'c2080100-0000-0000-0000-000000000001', 'b2080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Epóxi 1.1', 'UN', 10, 2250, 22500, 2025, 20250, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2080102-0000-0000-0000-000000000001', 'c2080100-0000-0000-0000-000000000001', 'b2080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Epóxi 1.2', 'm²', 10, 2250, 22500, 2025, 20250, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c2080200-0000-0000-0000-000000000001', 'b2080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '08.02', 'Pintura externa', 'UN', 1, 45000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2080201-0000-0000-0000-000000000001', 'c2080200-0000-0000-0000-000000000001', 'b2080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Epóxi 2.1', 'UN', 10, 2250, 22500, 2025, 20250, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d2080202-0000-0000-0000-000000000001', 'c2080200-0000-0000-0000-000000000001', 'b2080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Epóxi 2.2', 'm²', 10, 2250, 22500, 2025, 20250, now());

-- OBRA: Galpão Industrial Cajamar
INSERT INTO orcamento_versoes (id, obra_id, company_id, numero_versao, tipo, status, valor_total, origem, created_at, updated_at)
VALUES ('e3000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'v1.0', 'analitico', 'ativo', 1200000, 'manual', now(), now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3010000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '01', 'Terraplanagem', 120000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3010100-0000-0000-0000-000000000001', 'b3010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.01', 'Corte e compensação', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3010101-0000-0000-0000-000000000001', 'c3010100-0000-0000-0000-000000000001', 'b3010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Terra 1.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3010102-0000-0000-0000-000000000001', 'c3010100-0000-0000-0000-000000000001', 'b3010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Terra 1.2', 'm²', 10, 3000, 30000, 2700, 27000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3010200-0000-0000-0000-000000000001', 'b3010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '01.02', 'Aterro compactado', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3010201-0000-0000-0000-000000000001', 'c3010200-0000-0000-0000-000000000001', 'b3010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Terra 2.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3010202-0000-0000-0000-000000000001', 'c3010200-0000-0000-0000-000000000001', 'b3010000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Terra 2.2', 'm²', 10, 3000, 30000, 2700, 27000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3020000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '02', 'Fundação', 140000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3020100-0000-0000-0000-000000000001', 'b3020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.01', 'Sapatas isoladas', 'UN', 1, 70000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3020101-0000-0000-0000-000000000001', 'c3020100-0000-0000-0000-000000000001', 'b3020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sapata 1.1', 'UN', 10, 3500, 35000, 3150, 31500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3020102-0000-0000-0000-000000000001', 'c3020100-0000-0000-0000-000000000001', 'b3020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sapata 1.2', 'm²', 10, 3500, 35000, 3150, 31500, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3020200-0000-0000-0000-000000000001', 'b3020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '02.02', 'Vigas baldrame', 'UN', 1, 70000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3020201-0000-0000-0000-000000000001', 'c3020200-0000-0000-0000-000000000001', 'b3020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sapata 2.1', 'UN', 10, 3500, 35000, 3150, 31500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3020202-0000-0000-0000-000000000001', 'c3020200-0000-0000-0000-000000000001', 'b3020000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sapata 2.2', 'm²', 10, 3500, 35000, 3150, 31500, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3030000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '03', 'Estrutura', 180000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3030100-0000-0000-0000-000000000001', 'b3030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.01', 'Pilares metálicos', 'UN', 1, 90000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3030101-0000-0000-0000-000000000001', 'c3030100-0000-0000-0000-000000000001', 'b3030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Metálica 1.1', 'UN', 10, 4500, 45000, 4050, 40500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3030102-0000-0000-0000-000000000001', 'c3030100-0000-0000-0000-000000000001', 'b3030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Metálica 1.2', 'm²', 10, 4500, 45000, 4050, 40500, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3030200-0000-0000-0000-000000000001', 'b3030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '03.02', 'Tirantes', 'UN', 1, 90000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3030201-0000-0000-0000-000000000001', 'c3030200-0000-0000-0000-000000000001', 'b3030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Metálica 2.1', 'UN', 10, 4500, 45000, 4050, 40500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3030202-0000-0000-0000-000000000001', 'c3030200-0000-0000-0000-000000000001', 'b3030000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Metálica 2.2', 'm²', 10, 4500, 45000, 4050, 40500, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3040000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '04', 'Cobertura', 160000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3040100-0000-0000-0000-000000000001', 'b3040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '04.01', 'Telha trapezoidal', 'UN', 1, 80000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3040101-0000-0000-0000-000000000001', 'c3040100-0000-0000-0000-000000000001', 'b3040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Trapezoidal 1.1', 'UN', 10, 4000, 40000, 3600, 36000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3040102-0000-0000-0000-000000000001', 'c3040100-0000-0000-0000-000000000001', 'b3040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Trapezoidal 1.2', 'm²', 10, 4000, 40000, 3600, 36000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3040200-0000-0000-0000-000000000001', 'b3040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '04.02', 'Calhas e rufos', 'UN', 1, 80000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3040201-0000-0000-0000-000000000001', 'c3040200-0000-0000-0000-000000000001', 'b3040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Trapezoidal 2.1', 'UN', 10, 4000, 40000, 3600, 36000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3040202-0000-0000-0000-000000000001', 'c3040200-0000-0000-0000-000000000001', 'b3040000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Trapezoidal 2.2', 'm²', 10, 4000, 40000, 3600, 36000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3050000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '05', 'Fechamento', 120000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3050100-0000-0000-0000-000000000001', 'b3050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '05.01', 'Telha sanduíche', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3050101-0000-0000-0000-000000000001', 'c3050100-0000-0000-0000-000000000001', 'b3050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sanduíche 1.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3050102-0000-0000-0000-000000000001', 'c3050100-0000-0000-0000-000000000001', 'b3050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sanduíche 1.2', 'm²', 10, 3000, 30000, 2700, 27000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3050200-0000-0000-0000-000000000001', 'b3050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '05.02', 'Venezianas', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3050201-0000-0000-0000-000000000001', 'c3050200-0000-0000-0000-000000000001', 'b3050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sanduíche 2.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3050202-0000-0000-0000-000000000001', 'c3050200-0000-0000-0000-000000000001', 'b3050000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Sanduíche 2.2', 'm²', 10, 3000, 30000, 2700, 27000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3060000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '06', 'Piso', 140000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3060100-0000-0000-0000-000000000001', 'b3060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '06.01', 'Concreto polido', 'UN', 1, 70000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3060101-0000-0000-0000-000000000001', 'c3060100-0000-0000-0000-000000000001', 'b3060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Polido 1.1', 'UN', 10, 3500, 35000, 3150, 31500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3060102-0000-0000-0000-000000000001', 'c3060100-0000-0000-0000-000000000001', 'b3060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Polido 1.2', 'm²', 10, 3500, 35000, 3150, 31500, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3060200-0000-0000-0000-000000000001', 'b3060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '06.02', 'Juntas e tratamento', 'UN', 1, 70000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3060201-0000-0000-0000-000000000001', 'c3060200-0000-0000-0000-000000000001', 'b3060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Polido 2.1', 'UN', 10, 3500, 35000, 3150, 31500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3060202-0000-0000-0000-000000000001', 'c3060200-0000-0000-0000-000000000001', 'b3060000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Polido 2.2', 'm²', 10, 3500, 35000, 3150, 31500, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3070000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '07', 'Elétrica', 100000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3070100-0000-0000-0000-000000000001', 'b3070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '07.01', 'Painéis industriais', 'UN', 1, 50000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3070101-0000-0000-0000-000000000001', 'c3070100-0000-0000-0000-000000000001', 'b3070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Painel 1.1', 'UN', 10, 2500, 25000, 2250, 22500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3070102-0000-0000-0000-000000000001', 'c3070100-0000-0000-0000-000000000001', 'b3070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Painel 1.2', 'm²', 10, 2500, 25000, 2250, 22500, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3070200-0000-0000-0000-000000000001', 'b3070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '07.02', 'Iluminação LED galpão', 'UN', 1, 50000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3070201-0000-0000-0000-000000000001', 'c3070200-0000-0000-0000-000000000001', 'b3070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Painel 2.1', 'UN', 10, 2500, 25000, 2250, 22500, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3070202-0000-0000-0000-000000000001', 'c3070200-0000-0000-0000-000000000001', 'b3070000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Painel 2.2', 'm²', 10, 2500, 25000, 2250, 22500, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3080000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '08', 'Hidráulica', 120000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3080100-0000-0000-0000-000000000001', 'b3080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '08.01', 'Rede de incêndio', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3080101-0000-0000-0000-000000000001', 'c3080100-0000-0000-0000-000000000001', 'b3080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Incêndio 1.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3080102-0000-0000-0000-000000000001', 'c3080100-0000-0000-0000-000000000001', 'b3080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Incêndio 1.2', 'm²', 10, 3000, 30000, 2700, 27000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3080200-0000-0000-0000-000000000001', 'b3080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '08.02', 'Águas pluviais', 'UN', 1, 60000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3080201-0000-0000-0000-000000000001', 'c3080200-0000-0000-0000-000000000001', 'b3080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Incêndio 2.1', 'UN', 10, 3000, 30000, 2700, 27000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3080202-0000-0000-0000-000000000001', 'c3080200-0000-0000-0000-000000000001', 'b3080000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Incêndio 2.2', 'm²', 10, 3000, 30000, 2700, 27000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3090000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '09', 'Docas', 80000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3090100-0000-0000-0000-000000000001', 'b3090000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '09.01', 'Niveladoras de doca', 'UN', 1, 40000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3090101-0000-0000-0000-000000000001', 'c3090100-0000-0000-0000-000000000001', 'b3090000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Doca 1.1', 'UN', 10, 2000, 20000, 1800, 18000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3090102-0000-0000-0000-000000000001', 'c3090100-0000-0000-0000-000000000001', 'b3090000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Doca 1.2', 'm²', 10, 2000, 20000, 1800, 18000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3090200-0000-0000-0000-000000000001', 'b3090000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '09.02', 'Portões seccionados', 'UN', 1, 40000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3090201-0000-0000-0000-000000000001', 'c3090200-0000-0000-0000-000000000001', 'b3090000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Doca 2.1', 'UN', 10, 2000, 20000, 1800, 18000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3090202-0000-0000-0000-000000000001', 'c3090200-0000-0000-0000-000000000001', 'b3090000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Doca 2.2', 'm²', 10, 2000, 20000, 1800, 18000, now());

INSERT INTO orcamento_categorias (id, obra_id, company_id, versao_id, codigo, nome, preco_total, usa_composicoes, status_cronograma, created_at, updated_at)
VALUES ('b3100000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '10', 'Administrativo', 40000, true, 'nao_iniciada', now(), now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3100100-0000-0000-0000-000000000001', 'b3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '10.01', 'Estrutura escritório', 'UN', 1, 20000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3100101-0000-0000-0000-000000000001', 'c3100100-0000-0000-0000-000000000001', 'b3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Admin 1.1', 'UN', 10, 1000, 10000, 900, 9000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3100102-0000-0000-0000-000000000001', 'c3100100-0000-0000-0000-000000000001', 'b3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Admin 1.2', 'm²', 10, 1000, 10000, 900, 9000, now());
  INSERT INTO orcamento_composicoes (id, etapa_id, company_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_total, usa_subitens, created_at, updated_at)
  VALUES ('c3100200-0000-0000-0000-000000000001', 'b3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '10.02', 'Acabamentos escritório', 'UN', 1, 20000, true, now(), now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3100201-0000-0000-0000-000000000001', 'c3100200-0000-0000-0000-000000000001', 'b3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Admin 2.1', 'UN', 10, 1000, 10000, 900, 9000, now());
    INSERT INTO orcamento_subitens (id, composicao_id, categoria_id, company_id, nome, unidade, quantidade, preco_unitario, preco_total, custo_unitario, custo_total, created_at)
    VALUES ('d3100202-0000-0000-0000-000000000001', 'c3100200-0000-0000-0000-000000000001', 'b3100000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Insumo Admin 2.2', 'm²', 10, 1000, 10000, 900, 9000, now());

-- COTAÇÕES (Lotes, Itens e Respostas)
-- Obra A1 Lotes
INSERT INTO cotacao_lotes (id, obra_id, company_id, titulo, status, fase, created_at, updated_at)
VALUES ('71000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lote 1 — Materiais Estruturais', 'respondido', 'analise', now(), now());
INSERT INTO cotacao_lotes (id, obra_id, company_id, titulo, status, fase, created_at, updated_at)
VALUES ('72000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lote 2 — Materiais de Alvenaria e Revestimento', 'respondido', 'cotacao', now(), now());
INSERT INTO cotacao_lotes (id, obra_id, company_id, titulo, status, fase, created_at, updated_at)
VALUES ('73000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lote 3 — Materiais Elétricos e Hidráulicos', 'aguardando', 'cotacao', now(), now());
-- Obra A2 Lotes
INSERT INTO cotacao_lotes (id, obra_id, company_id, titulo, status, fase, created_at, updated_at)
VALUES ('74000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lote 1 — Estrutura e Fundação', 'aguardando', 'cotacao', now(), now());

-- Itens do Lote 1 (A1 - Estruturais)
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'd1020101-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'd1020101-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 450, 3, '', true, now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000001', 'd1020101-0000-0000-0000-000000000001', 'Aço & Cia Distribuidora', 485, 2, '', false, now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000001', 'd1020102-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000001', 'd1020102-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 10.8, 5, '', false, now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000004', '71000000-0000-0000-0000-000000000001', 'd1020102-0000-0000-0000-000000000001', 'Aço & Cia Distribuidora', 9.9, 7, '', true, now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000001', 'd1020202-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000005', '71000000-0000-0000-0000-000000000001', 'd1020202-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 10.5, 5, '', false, now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000006', '71000000-0000-0000-0000-000000000001', 'd1020202-0000-0000-0000-000000000001', 'Aço & Cia Distribuidora', 9.7, 7, '', true, now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000004', '71000000-0000-0000-0000-000000000001', 'd1010202-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000007', '71000000-0000-0000-0000-000000000001', 'd1010202-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 75, 3, '', true, now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000008', '71000000-0000-0000-0000-000000000001', 'd1010202-0000-0000-0000-000000000001', 'Aço & Cia Distribuidora', 82, 5, '', false, now());

-- Itens do Lote 2 (A1 - Alvenaria)
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000001', 'd1030101-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000009', '72000000-0000-0000-0000-000000000001', 'd1030101-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 1.15, 2, '', false, now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000006', '72000000-0000-0000-0000-000000000001', 'd1050202-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000010', '72000000-0000-0000-0000-000000000001', 'd1050202-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 26.5, 2, '', false, now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000007', '72000000-0000-0000-0000-000000000001', 'd1050201-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000011', '72000000-0000-0000-0000-000000000001', 'd1050201-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 62, 5, '', false, now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000008', '72000000-0000-0000-0000-000000000001', 'd1050203-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_respostas (id, lote_id, item_origem_id, fornecedor_nome, preco_unitario, prazo_entrega_dias, observacoes, is_vencedor, created_at)
VALUES ('70000001-0000-0000-0000-000000000012', '72000000-0000-0000-0000-000000000001', 'd1050203-0000-0000-0000-000000000001', 'Depósito São Paulo Materiais de Construção', 14.5, 2, '', false, now());

-- Itens do Lote 3 (A1 - Elétrica/Hidráulica)
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000009', '73000000-0000-0000-0000-000000000001', 'd1060101-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000010', '73000000-0000-0000-0000-000000000001', 'd1060102-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000011', '73000000-0000-0000-0000-000000000001', 'd1070101-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000012', '73000000-0000-0000-0000-000000000001', 'd1070201-0000-0000-0000-000000000001', now());

-- Itens do Lote 4 (A2 - Estrutura)
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000013', '74000000-0000-0000-0000-000000000001', 'd2010101-0000-0000-0000-000000000001', now());
INSERT INTO cotacao_lote_itens (id, lote_id, item_origem_id, created_at) VALUES ('70000000-0000-0000-0000-000000000014', '74000000-0000-0000-0000-000000000001', 'd2020101-0000-0000-0000-000000000001', now());
