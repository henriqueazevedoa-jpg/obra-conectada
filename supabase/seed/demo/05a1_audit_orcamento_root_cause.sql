-- =====================================================
-- 05a1_audit_orcamento_root_cause.sql
-- Auditoria Root Cause do Orçamento da Residência Alto da Serra
-- Apenas SELECTs — Sprint Seed 05A.1
-- =====================================================

-- 1. Hierarquia completa: categorias vs composições vs subitens
SELECT
  cat.id AS categoria_id,
  cat.nome AS categoria_nome,
  cat.preco_total AS preco_total_categoria,
  COUNT(DISTINCT comp.id) AS qtd_composicoes,
  COUNT(DISTINCT sub.id) AS qtd_subitens,
  COALESCE(SUM(DISTINCT comp.preco_total), 0) AS soma_composicoes,
  COALESCE(SUM(sub.preco_total), 0) AS soma_subitens,
  ROUND(cat.preco_total - COALESCE(SUM(sub.preco_total), 0), 2) AS diferenca_categoria_vs_subitens,
  CASE
    WHEN COUNT(DISTINCT comp.id) = 0 AND cat.preco_total > 0 THEN 'CATEGORIA_COM_TOTAL_SEM_COMPOSICOES'
    WHEN COUNT(DISTINCT comp.id) > 0 AND COUNT(DISTINCT sub.id) = 0 THEN 'COMPOSICOES_SEM_SUBITENS'
    WHEN ROUND(cat.preco_total, 2) <> ROUND(COALESCE(SUM(sub.preco_total), 0), 2) THEN 'TOTAL_CATEGORIA_DIVERGE_DOS_FILHOS'
    ELSE 'OK'
  END AS status
FROM orcamento_categorias cat
LEFT JOIN orcamento_composicoes comp ON comp.etapa_id = cat.id
LEFT JOIN orcamento_subitens sub ON sub.composicao_id = comp.id
WHERE cat.obra_id = 'a1000000-0000-0000-0000-000000000001'
GROUP BY cat.id, cat.nome, cat.preco_total
ORDER BY status DESC, cat.nome;

-- 2. Versão ativa e divergência de totalizadores
SELECT
  v.id AS versao_id,
  v.numero_versao,
  v.tipo,
  v.status AS versao_status,
  v.valor_total AS valor_total_versao,
  (SELECT COALESCE(SUM(c.preco_total),0) FROM orcamento_categorias c WHERE c.obra_id = v.obra_id) AS soma_categorias,
  (SELECT COALESCE(SUM(cp.preco_total),0) FROM orcamento_composicoes cp JOIN orcamento_categorias c ON c.id = cp.etapa_id WHERE c.obra_id = v.obra_id) AS soma_composicoes,
  (SELECT COALESCE(SUM(s.preco_total),0) FROM orcamento_subitens s JOIN orcamento_composicoes cp ON cp.id = s.composicao_id JOIN orcamento_categorias c ON c.id = cp.etapa_id WHERE c.obra_id = v.obra_id) AS soma_subitens,
  v.valor_total - (SELECT COALESCE(SUM(s.preco_total),0) FROM orcamento_subitens s JOIN orcamento_composicoes cp ON cp.id = s.composicao_id JOIN orcamento_categorias c ON c.id = cp.etapa_id WHERE c.obra_id = v.obra_id) AS diferenca_versao_vs_subitens
FROM orcamento_versoes v
WHERE v.obra_id = 'a1000000-0000-0000-0000-000000000001'
ORDER BY v.created_at DESC;

-- 3. Divergência de campos duplos: preco_total vs custo_total nos subitens
SELECT
  COUNT(*) AS total_subitens,
  COUNT(CASE WHEN sub.preco_total IS NOT NULL AND sub.preco_total > 0 THEN 1 END) AS com_preco_total,
  COUNT(CASE WHEN sub.custo_total IS NOT NULL AND sub.custo_total > 0 THEN 1 END) AS com_custo_total,
  COUNT(CASE WHEN sub.preco_total IS NOT NULL AND sub.custo_total IS NOT NULL AND sub.preco_total <> sub.custo_total THEN 1 END) AS preco_diverge_custo,
  COUNT(CASE WHEN sub.preco_total IS NULL AND sub.custo_total IS NULL THEN 1 END) AS ambos_nulos
FROM orcamento_subitens sub
JOIN orcamento_composicoes comp ON comp.id = sub.composicao_id
JOIN orcamento_categorias cat ON cat.id = comp.etapa_id
WHERE cat.obra_id = 'a1000000-0000-0000-0000-000000000001';

-- 4. Órfãos globais (company_id demo)
SELECT 'subitens_sem_composicao' AS tipo, COUNT(*) AS total
FROM orcamento_subitens
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND composicao_id NOT IN (SELECT id FROM orcamento_composicoes)
UNION ALL
SELECT 'subitens_sem_categoria', COUNT(*)
FROM orcamento_subitens
WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND categoria_id NOT IN (SELECT id FROM orcamento_categorias);

-- 5. Contagem geral da obra a1
SELECT
  (SELECT COUNT(*) FROM orcamento_categorias WHERE obra_id = 'a1000000-0000-0000-0000-000000000001') AS total_categorias,
  (SELECT COUNT(*) FROM orcamento_composicoes comp JOIN orcamento_categorias cat ON cat.id = comp.etapa_id WHERE cat.obra_id = 'a1000000-0000-0000-0000-000000000001') AS total_composicoes,
  (SELECT COUNT(*) FROM orcamento_subitens sub JOIN orcamento_composicoes comp ON comp.id = sub.composicao_id JOIN orcamento_categorias cat ON cat.id = comp.etapa_id WHERE cat.obra_id = 'a1000000-0000-0000-0000-000000000001') AS total_subitens;
