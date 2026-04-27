-- =====================================================
-- 04_validate_orcamento.sql — Validar Seed Demo de Orçamento
-- Apenas SELECTs para aferir o volume inserido
-- =====================================================

-- 1. Versões por obra
SELECT obra_id, count(*) AS versoes FROM orcamento_versoes 
WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003')
GROUP BY obra_id;

-- 2. Categorias por obra
SELECT obra_id, count(*) AS categorias FROM orcamento_categorias 
WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003')
GROUP BY obra_id;

-- 3. Composições por obra (via etapa_id -> categoria)
SELECT c.obra_id, count(p.*) AS composicoes 
FROM orcamento_composicoes p
JOIN orcamento_categorias c ON p.etapa_id = c.id
WHERE c.obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003')
GROUP BY c.obra_id;

-- 4. Subitens por obra (via composicao -> categoria)
SELECT c.obra_id, count(s.*) AS subitens
FROM orcamento_subitens s
JOIN orcamento_composicoes p ON s.composicao_id = p.id
JOIN orcamento_categorias c ON p.etapa_id = c.id
WHERE c.obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003')
GROUP BY c.obra_id;

-- 5. Composições sem categoria válida
SELECT p.id FROM orcamento_composicoes p
WHERE p.etapa_id NOT IN (SELECT id FROM orcamento_categorias)
  AND p.company_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- 6. Subitens sem composição válida
SELECT s.id FROM orcamento_subitens s
WHERE s.composicao_id NOT IN (SELECT id FROM orcamento_composicoes)
  AND s.company_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- 7. Categorias com parent_id inválido
SELECT c.id FROM orcamento_categorias c
WHERE c.parent_id IS NOT NULL 
  AND c.parent_id NOT IN (SELECT id FROM orcamento_categorias)
  AND c.company_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- 8. Totais previstos por obra
SELECT obra_id, sum(preco_total) AS total_categorias FROM orcamento_categorias
WHERE obra_id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003')
GROUP BY obra_id;

-- 9. Registros fora das 3 obras demo para a empresa de teste
SELECT id, 'orcamento_categorias fora da demo' as relatorio FROM orcamento_categorias
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND obra_id NOT IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003');
