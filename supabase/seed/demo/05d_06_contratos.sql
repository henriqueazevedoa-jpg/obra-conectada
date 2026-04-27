-- =====================================================
-- SEED 05D-06: Contratos + Medições
-- Constraint: tipo IN (cliente, empreiteiro, fornecedor)
-- Constraint: modalidade IN (percentual, quantidade, misto, valor_fixo)
-- Constraint: status IN (rascunho, ativo, suspenso, encerrado, rescindido)
-- Constraint: medicao.status IN (rascunho, emitido, aprovado, contestado, pago)
-- =====================================================

DELETE FROM contratos_medicoes WHERE obra_id = 'a1000000-0000-0000-0000-000000000001';
DELETE FROM contratos WHERE obra_id = 'a1000000-0000-0000-0000-000000000001';

INSERT INTO contratos (id, obra_id, numero, tipo, descricao, contratado, contratado_id, valor_inicial, valor_atual, modalidade_medicao, status, data_inicio, data_fim_prevista, cnpj) VALUES
  ('e1c00100-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'CT-2026-001','empreiteiro','Contrato principal - Construção Residência Alto da Serra',
   'Ferreira Construções','c1d00400-0000-0000-0000-000000000001',
   620000,620000,'percentual','ativo','2026-01-06','2026-10-31','11.222.333/0001-44'),
  ('e1c00200-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'CT-2026-002','fornecedor','Instalações elétricas completas',
   'Elétrica Raio',NULL,52000,52000,'percentual','ativo','2026-05-19','2026-06-06','45.678.901/0001-04'),
  ('e1c00300-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'CT-2026-003','fornecedor','Instalações hidrossanitárias',
   'HidroTubos Comércio',NULL,48100,48100,'percentual','ativo','2026-05-12','2026-05-30','56.789.012/0001-05');

INSERT INTO contratos_medicoes (id, obra_id, contrato_id, numero_medicao, data_referencia, status, percentual_periodo, percentual_acumulado, valor_periodo, valor_acumulado) VALUES
  ('e1ae0101-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','e1c00100-0000-0000-0000-000000000001',1,'2026-02-28','aprovado',10,10,62000,62000),
  ('e1ae0102-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','e1c00100-0000-0000-0000-000000000001',2,'2026-03-31','aprovado',25,35,155000,217000),
  ('e1ae0103-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','e1c00100-0000-0000-0000-000000000001',3,'2026-04-30','aprovado',20,55,124000,341000),
  ('e1ae0104-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','e1c00100-0000-0000-0000-000000000001',4,'2026-05-31','emitido',8,63,49600,390600),
  ('e1ae0301-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','e1c00300-0000-0000-0000-000000000001',1,'2026-05-19','aprovado',40,40,19240,19240);
