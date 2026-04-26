CREATE OR REPLACE VIEW v_custos_por_obra AS
SELECT
  obra_id,
  company_id,
  COUNT(DISTINCT arquivo_id) as arquivos_processados,
  SUM(CASE WHEN fase = 'classificacao_gemini' THEN tokens_entrada + tokens_saida ELSE 0 END) as tokens_gemini_flash,
  SUM(CASE WHEN fase = 'extracao_claude' THEN tokens_entrada ELSE 0 END) as tokens_claude_entrada,
  SUM(CASE WHEN fase = 'extracao_claude' THEN tokens_saida ELSE 0 END) as tokens_claude_saida,
  SUM(CASE WHEN fase = 'embedding_gemini' THEN unidades ELSE 0 END) as embeddings_gerados,
  SUM(custo_usd) as custo_total_usd,
  MIN(created_at) as primeiro_processamento,
  MAX(created_at) as ultimo_processamento
FROM processamento_custos
GROUP BY obra_id, company_id;
