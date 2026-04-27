-- =====================================================
-- SEED 05D-01: Fornecedores + Contatos
-- Obra: Residência Alto da Serra (a1000000...0001)
-- Idempotente: DELETE antes de INSERT
-- =====================================================

-- Cleanup
DELETE FROM fornecedores WHERE obra_id = 'a1000000-0000-0000-0000-000000000001';
DELETE FROM contatos WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- === FORNECEDORES (7) ===
INSERT INTO fornecedores (id, obra_id, company_id, nome, cnpj, telefone, email, cidade, observacoes, especialidades) VALUES
  ('f1d00100-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Concreteira São Paulo','12.345.678/0001-01','(11) 3456-7890','vendas@concreteira-sp.com.br','Atibaia - SP',
   'Fornecedor principal de concreto usinado. Contrato para entrega programada.',ARRAY['concreto','agregados']),
  ('f1d00200-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Madeireira Alto da Serra','23.456.789/0001-02','(11) 4567-8901','contato@madeireira-serra.com.br','Atibaia - SP',
   'Formas, escoras, tábuas para obra. Entrega em até 3 dias.',ARRAY['madeira']),
  ('f1d00300-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Aço Forte Distribuidora','34.567.890/0001-03','(11) 5678-9012','comercial@acoforte.com.br','Guarulhos - SP',
   'Vergalhões CA-50/60, telas soldadas. Preço competitivo acima de 5t.',ARRAY['aco','ferragens']),
  ('f1d00400-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Elétrica Raio','45.678.901/0001-04','(11) 6789-0123','orcamentos@eletricaraio.com.br','São Paulo - SP',
   'Material elétrico completo. Conduletes, fios, disjuntores, QDC.',ARRAY['eletrica']),
  ('f1d00500-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'HidroTubos Comércio','56.789.012/0001-05','(11) 7890-1234','vendas@hidrotubos.com.br','Jundiaí - SP',
   'Tubos PVC, conexões, registros, caixas sifonadas.',ARRAY['hidraulica']),
  ('f1d00600-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Telhas & Coberturas Ltda','67.890.123/0001-06','(11) 8901-2345','comercial@telhascoberturas.com.br','Campinas - SP',
   'Telhas cerâmicas, cumeeiras, rufo. Cobertura completa.',ARRAY['cobertura']),
  ('f1d00700-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Depósito Constrular','78.901.234/0001-07','(11) 9012-3456','lojas@constrular.com.br','Atibaia - SP',
   'Material geral: cimento, argamassa, impermeabilizante, blocos.',ARRAY['cimento','alvenaria','impermeabilizacao']);

-- === CONTATOS (5) ===
INSERT INTO contatos (id, company_id, nome, tipo, empresa, especialidade, telefone, whatsapp, email, cidade, cnpj, tags, observacoes, obra_ids) VALUES
  ('c1d00100-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Ricardo Almeida','cliente',NULL,NULL,'(11) 99887-6543','(11) 99887-6543',
   'ricardo.almeida@email.com','São Paulo - SP','123.456.789-00',
   ARRAY['proprietário','decisor'],'Proprietário da Residência Alto da Serra.',
   ARRAY['a1000000-0000-0000-0000-000000000001']::uuid[]),
  ('c1d00200-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Eng. Marcos Silva','projetista','MS Engenharia','Engenheiro Civil',
   '(11) 98765-4321','(11) 98765-4321','marcos@msengenharia.com.br','Atibaia - SP',NULL,
   ARRAY['engenheiro','responsável técnico'],'Responsável técnico. CREA-SP 123456.',
   ARRAY['a1000000-0000-0000-0000-000000000001']::uuid[]),
  ('c1d00300-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'José Carlos (Zé Carlos)','mao_de_obra',NULL,'Mestre de Obras',
   '(11) 97654-3210','(11) 97654-3210',NULL,'Atibaia - SP',NULL,
   ARRAY['mestre','execução'],'Mestre com 20 anos de experiência. Equipe de 8.',
   ARRAY['a1000000-0000-0000-0000-000000000001']::uuid[]),
  ('c1d00400-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Antônio Ferreira','mao_de_obra','Ferreira Construções','Empreiteiro - Alvenaria e Estrutura',
   '(11) 96543-2109','(11) 96543-2109','antonio@ferreiraconstrucoes.com.br','Bragança Paulista - SP',
   '11.222.333/0001-44',ARRAY['empreiteiro','estrutura','alvenaria'],
   'Empreiteiro principal. Contrato por etapa.',
   ARRAY['a1000000-0000-0000-0000-000000000001']::uuid[]),
  ('c1d00500-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'Arq. Fernanda Costa','projetista','FC Arquitetura','Arquiteta',
   '(11) 95432-1098','(11) 95432-1098','fernanda@fcarquitetura.com.br','São Paulo - SP',NULL,
   ARRAY['arquiteta','projeto'],'Autora do projeto. Acompanhamento mensal.',
   ARRAY['a1000000-0000-0000-0000-000000000001']::uuid[]);
