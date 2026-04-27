-- =============================================================================
-- SEED-05C Validation Queries
-- Verificar integridade e alinhamento dos dados seedados
-- SOMENTE LEITURA — não altera nenhum dado
-- =============================================================================

-- ── 1. Tabelas Fantasma ─────────────────────────────────────────────────────
-- Verifica se todas as tabelas que o frontend referencia existem no schema
SELECT 'pendencias' AS tabela, 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pendencias')
       THEN '✅ Existe' ELSE '🚫 NÃO EXISTE' END AS status
UNION ALL
SELECT 'voice_inputs', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='voice_inputs')
       THEN '✅ Existe' ELSE '🚫 NÃO EXISTE' END;


-- ── 2. Documentos: campos que o frontend grava vs schema real ───────────────
-- Detecta se documentos_obra tem os campos que o frontend espera
SELECT column_name, data_type,
  CASE column_name
    WHEN 'url_arquivo' THEN '⚠️ Frontend grava arquivo_url (nome diferente)'
    WHEN 'tamanho' THEN '⚠️ Frontend grava tamanho_bytes (nome diferente)'
    ELSE '✅'
  END AS alinhamento
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documentos_obra'
ORDER BY ordinal_position;


-- ── 3. Contagem de registros por módulo para obra demo ──────────────────────
-- Substituir o UUID pela obra_id real
WITH obra AS (SELECT 'a1000000-0000-0000-0000-000000000001'::uuid AS id)
SELECT 'pagamentos' AS modulo, COUNT(*) AS registros FROM pagamentos WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'recebiveis', COUNT(*) FROM recebiveis WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'custo_real_itens', COUNT(*) FROM custo_real_itens WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'contratos', COUNT(*) FROM contratos WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'contratos_medicoes', COUNT(*) FROM contratos_medicoes WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'cronograma_tarefas', COUNT(*) FROM cronograma_tarefas WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'cronograma_dependencias', COUNT(*) FROM cronograma_dependencias WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'diario_registros', COUNT(*) FROM diario_registros WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'obra_agenda', COUNT(*) FROM obra_agenda WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'fornecedores', COUNT(*) FROM fornecedores WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'documentos_obra', COUNT(*) FROM documentos_obra WHERE obra_id = (SELECT id FROM obra)
UNION ALL SELECT 'obra_links', COUNT(*) FROM obra_links WHERE obra_id = (SELECT id FROM obra)
ORDER BY modulo;


-- ── 4. Pagamentos: verificar enums válidos ──────────────────────────────────
-- Detecta valores inválidos para tipo_pagamento, status, forma_pagamento
SELECT 'tipo_pagamento_invalido' AS check_type, tipo_pagamento AS valor, COUNT(*) AS qtd
FROM pagamentos
WHERE tipo_pagamento NOT IN ('material','mao_de_obra','servico','aluguel','outro')
GROUP BY tipo_pagamento
UNION ALL
SELECT 'status_invalido', status::text, COUNT(*)
FROM pagamentos
WHERE status::text NOT IN ('previsto','pago','atrasado','cancelado')
GROUP BY status
UNION ALL
SELECT 'forma_invalida', forma_pagamento::text, COUNT(*)
FROM pagamentos
WHERE forma_pagamento::text NOT IN ('boleto','pix','cartao','transferencia','dinheiro','outro')
GROUP BY forma_pagamento;


-- ── 5. Recebíveis: verificar status válidos ─────────────────────────────────
SELECT 'recebiveis_status_invalido' AS check_type, status AS valor, COUNT(*)
FROM recebiveis
WHERE status NOT IN ('pendente','a_vencer','vencido','recebido','parcial','cancelado')
GROUP BY status;


-- ── 6. Cronograma: verificar tarefas órfãs (parent_tarefa_id aponta para id inexistente)
SELECT ct.id, ct.nome, ct.parent_tarefa_id
FROM cronograma_tarefas ct
WHERE ct.parent_tarefa_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM cronograma_tarefas p WHERE p.id = ct.parent_tarefa_id);


-- ── 7. Cronograma: dependências com tarefa_origem ou tarefa_destino inexistente
SELECT cd.id, cd.tarefa_origem_id, cd.tarefa_destino_id, cd.tipo
FROM cronograma_dependencias cd
WHERE NOT EXISTS (SELECT 1 FROM cronograma_tarefas WHERE id = cd.tarefa_origem_id)
   OR NOT EXISTS (SELECT 1 FROM cronograma_tarefas WHERE id = cd.tarefa_destino_id);


-- ── 8. Diário: verificar enums ──────────────────────────────────────────────
SELECT 'clima_invalido' AS check_type, clima::text AS valor, COUNT(*)
FROM diario_registros
WHERE clima::text NOT IN ('sol','nublado','chuva','chuvoso_forte')
GROUP BY clima
UNION ALL
SELECT 'diario_status_invalido', status::text, COUNT(*)
FROM diario_registros
WHERE status::text NOT IN ('pendente','aprovado','rejeitado')
GROUP BY status;


-- ── 9. Contratos: medições sem contrato pai ─────────────────────────────────
SELECT cm.id AS medicao_id, cm.contrato_id
FROM contratos_medicoes cm
WHERE NOT EXISTS (SELECT 1 FROM contratos c WHERE c.id = cm.contrato_id);


-- ── 10. Fornecedores: verificar unicidade nome+obra ────────────────────────
SELECT obra_id, nome, COUNT(*) AS duplicatas
FROM fornecedores
GROUP BY obra_id, nome
HAVING COUNT(*) > 1;


-- ── 11. Custo Real: verificar que company_id está preenchido ────────────────
SELECT COUNT(*) AS custo_real_sem_company
FROM custo_real_itens
WHERE company_id IS NULL;


-- ── 12. Agenda: verificar company_id NOT NULL ───────────────────────────────
SELECT COUNT(*) AS agenda_sem_company
FROM obra_agenda
WHERE company_id IS NULL;


-- ── 13. Contatos: verificar enum tipo_contato ───────────────────────────────
SELECT tipo::text AS valor, COUNT(*)
FROM contatos
WHERE tipo::text NOT IN ('cliente','fornecedor_material','mao_de_obra','parceiro','projetista','outro')
GROUP BY tipo;


-- ── 14. Recebíveis: pagamentos vencidos hoje sem tratamento ─────────────────
-- Lista recebíveis com data_vencimento passada e status ainda 'pendente'
SELECT id, descricao, data_vencimento, status, valor_faturado
FROM recebiveis
WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE
ORDER BY data_vencimento;


-- ── 15. Pagamentos: possíveis auto-atrasados pelo frontend ──────────────────
-- Pagamentos que serão auto-marcados como atrasados quando o frontend carregar
SELECT id, descricao, data_vencimento, status
FROM pagamentos
WHERE status = 'previsto'
  AND data_vencimento < CURRENT_DATE
ORDER BY data_vencimento;


-- ── 16. Diário: servicos órfãos (sem registro pai) ─────────────────────────
SELECT ds.id, ds.registro_id, ds.descricao
FROM diario_servicos ds
WHERE NOT EXISTS (SELECT 1 FROM diario_registros dr WHERE dr.id = ds.registro_id);


-- ── 17. Resumo geral de saúde dos dados ────────────────────────────────────
SELECT 
  (SELECT COUNT(*) FROM pagamentos) AS total_pagamentos,
  (SELECT COUNT(*) FROM recebiveis) AS total_recebiveis,
  (SELECT COUNT(*) FROM custo_real_itens) AS total_custo_real,
  (SELECT COUNT(*) FROM contratos) AS total_contratos,
  (SELECT COUNT(*) FROM contratos_medicoes) AS total_medicoes,
  (SELECT COUNT(*) FROM cronograma_tarefas) AS total_tarefas,
  (SELECT COUNT(*) FROM cronograma_dependencias) AS total_dependencias,
  (SELECT COUNT(*) FROM diario_registros) AS total_diario,
  (SELECT COUNT(*) FROM obra_agenda) AS total_agenda,
  (SELECT COUNT(*) FROM fornecedores) AS total_fornecedores,
  (SELECT COUNT(*) FROM documentos_obra) AS total_documentos,
  (SELECT COUNT(*) FROM contatos) AS total_contatos,
  (SELECT COUNT(*) FROM obra_links) AS total_links;
