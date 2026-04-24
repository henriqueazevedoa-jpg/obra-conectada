-- ============================================================
-- LASTRA — Seed: Cronograma
-- Obra: Residência Vila Nova (a1000000-0000-0000-0000-000000000001)
-- Company: ObraFácil DEV (bbbbbbbb-0000-0000-0000-000000000001)
-- Executar APÓS seed_base.sql e seed_orcamento.sql
-- ============================================================

-- Limpar dados anteriores desta obra (idempotente)
DELETE FROM cronograma_dependencias WHERE obra_id = 'a1000000-0000-0000-0000-000000000001';
DELETE FROM cronograma_tarefas WHERE obra_id = 'a1000000-0000-0000-0000-000000000001';

-- ── ETAPA 1: Fundações (concluída, 60-30 dias atrás) ─────────
INSERT INTO cronograma_tarefas
  (id, obra_id, company_id, nome, tipo_tarefa, nivel, ordem,
   data_inicio, data_fim, duracao_dias,
   percentual_concluido, status,
   baseline_inicio, baseline_fim, baseline_locked,
   is_critico, peso_orcamento, pode_editar_datas,
   parent_tarefa_id, dias_impedidos)
VALUES
('ca000001-0000-0000-0000-000000000001',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Fundações','RESUMO',1,1,
 CURRENT_DATE-60,CURRENT_DATE-30,31,
 100,'concluida',
 CURRENT_DATE-60,CURRENT_DATE-30,true,
 false,25,true,NULL,0),

-- Filho 1.1: Escavação
('ca000001-0000-0000-0000-000000000002',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Escavação manual','PADRAO',2,1,
 CURRENT_DATE-60,CURRENT_DATE-50,11,
 100,'concluida',
 CURRENT_DATE-60,CURRENT_DATE-50,true,
 false,10,true,
 'ca000001-0000-0000-0000-000000000001',0),

-- Filho 1.2: Sapatas
('ca000001-0000-0000-0000-000000000003',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Sapatas de concreto','PADRAO',2,2,
 CURRENT_DATE-49,CURRENT_DATE-31,19,
 100,'concluida',
 CURRENT_DATE-49,CURRENT_DATE-31,true,
 false,15,true,
 'ca000001-0000-0000-0000-000000000001',0),

-- ── ETAPA 2: Estrutura (em andamento, baseline divergente) ───
('ca000001-0000-0000-0000-000000000004',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Estrutura','RESUMO',1,2,
 CURRENT_DATE-30,CURRENT_DATE+15,46,
 60,'em_andamento',
 CURRENT_DATE-30,CURRENT_DATE+5,true,
 true,40,true,NULL,0),

-- Filho 2.1: Pilares (concluído)
('ca000001-0000-0000-0000-000000000005',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Pilares concreto armado','PADRAO',2,1,
 CURRENT_DATE-30,CURRENT_DATE-10,21,
 100,'concluida',
 CURRENT_DATE-30,CURRENT_DATE-10,true,
 false,20,true,
 'ca000001-0000-0000-0000-000000000004',0),

-- Filho 2.2: Vigas e laje (ATRASADA — data_fim no passado, % < 100)
('ca000001-0000-0000-0000-000000000006',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Vigas e laje','PADRAO',2,2,
 CURRENT_DATE-9,CURRENT_DATE-2,8,
 40,'atrasada',
 CURRENT_DATE-9,CURRENT_DATE-2,true,
 true,20,true,
 'ca000001-0000-0000-0000-000000000004',0),

-- ── ETAPA 3: Instalações Elétricas (futura) ──────────────────
('ca000001-0000-0000-0000-000000000007',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Instalações Elétricas','RESUMO',1,3,
 CURRENT_DATE+16,CURRENT_DATE+45,30,
 0,'nao_iniciada',
 CURRENT_DATE+16,CURRENT_DATE+45,true,
 false,35,true,NULL,0),

-- Filho 3.1: Marco de entrega
('ca000001-0000-0000-0000-000000000008',
 'a1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
 'Entrega instalações elétricas','MARCO',2,1,
 CURRENT_DATE+45,CURRENT_DATE+45,1,
 0,'nao_iniciada',
 CURRENT_DATE+45,CURRENT_DATE+45,true,
 false,0,true,
 'ca000001-0000-0000-0000-000000000007',0);

-- ── Dependências ─────────────────────────────────────────────
INSERT INTO cronograma_dependencias (id, obra_id, tarefa_origem_id, tarefa_destino_id, tipo, lag_dias)
VALUES
 -- Escavação → Sapatas (FS)
 (gen_random_uuid(),'a1000000-0000-0000-0000-000000000001',
  'ca000001-0000-0000-0000-000000000002','ca000001-0000-0000-0000-000000000003','FS',0),
 -- Sapatas → Pilares (FS)
 (gen_random_uuid(),'a1000000-0000-0000-0000-000000000001',
  'ca000001-0000-0000-0000-000000000003','ca000001-0000-0000-0000-000000000005','FS',0),
 -- Pilares → Vigas (FS)
 (gen_random_uuid(),'a1000000-0000-0000-0000-000000000001',
  'ca000001-0000-0000-0000-000000000005','ca000001-0000-0000-0000-000000000006','FS',0),
 -- Estrutura → Instalações (FS)
 (gen_random_uuid(),'a1000000-0000-0000-0000-000000000001',
  'ca000001-0000-0000-0000-000000000006','ca000001-0000-0000-0000-000000000007','FS',0);
