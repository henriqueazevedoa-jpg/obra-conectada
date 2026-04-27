-- =====================================================
-- 04c_validate_orcamento_subitens.sql — Validação de Enriquecimento
-- =====================================================

-- 1. Total de subitens por obra
SELECT 
  cat.obra_id, 
  o.nome AS nome_obra, 
  COUNT(sub.id) AS total_subitens
FROM orcamento_subitens sub
JOIN orcamento_composicoes comp ON sub.composicao_id = comp.id
JOIN orcamento_categorias cat ON comp.etapa_id = cat.id
JOIN obras o ON cat.obra_id = o.id
WHERE cat.obra_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000003'
)
GROUP BY cat.obra_id, o.nome
ORDER BY cat.obra_id;

-- 2. Subitens por composição (para garantir a distribuição planejada)
SELECT 
  comp.codigo, 
  comp.descricao AS composicao_nome, 
  COUNT(sub.id) AS qtd_subitens,
  SUM(sub.preco_total) AS soma_total_subitens
FROM orcamento_subitens sub
JOIN orcamento_composicoes comp ON sub.composicao_id = comp.id
JOIN orcamento_categorias cat ON comp.etapa_id = cat.id
WHERE cat.obra_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000003'
)
GROUP BY comp.codigo, comp.descricao
ORDER BY comp.codigo;

-- 3. Subitens órfãos (sem composição válida)
SELECT id, nome, composicao_id
FROM orcamento_subitens
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND (composicao_id IS NULL OR composicao_id NOT IN (SELECT id FROM orcamento_composicoes));

-- 4. Subitens acidentalmente inseridos em obras pré-existentes
SELECT sub.id, sub.nome, cat.obra_id
FROM orcamento_subitens sub
JOIN orcamento_composicoes comp ON sub.composicao_id = comp.id
JOIN orcamento_categorias cat ON comp.etapa_id = cat.id
WHERE cat.obra_id IN (
  'a2000000-0000-0000-0000-000000000001', -- Alphaville
  'a3000000-0000-0000-0000-000000000001'  -- Cajamar
);

-- 5. Subitens com quantidade nula ou negativa
SELECT id, nome, quantidade
FROM orcamento_subitens
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND (quantidade IS NULL OR quantidade <= 0);

-- 6. Subitens com valor unitário negativo
SELECT id, nome, preco_unitario
FROM orcamento_subitens
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND preco_unitario < 0;

-- 7. Totais incoerentes (preco_total <> quantidade * preco_unitario)
SELECT id, nome, quantidade, preco_unitario, preco_total, (quantidade * preco_unitario) AS esperado
FROM orcamento_subitens
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND ROUND(preco_total, 2) <> ROUND((quantidade * preco_unitario), 2);

-- 8. Totais financeiros por obra consolidados via subitens
SELECT 
  cat.obra_id, 
  SUM(sub.preco_total) AS custo_total_via_subitens
FROM orcamento_subitens sub
JOIN orcamento_composicoes comp ON sub.composicao_id = comp.id
JOIN orcamento_categorias cat ON comp.etapa_id = cat.id
WHERE cat.obra_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000003'
)
GROUP BY cat.obra_id
ORDER BY cat.obra_id;
