CREATE TABLE catalogo_composicao_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id uuid NOT NULL REFERENCES catalogo_composicoes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  descricao text NOT NULL DEFAULT '',
  unidade text,
  quantidade numeric,
  preco_unitario numeric,
  tipo_item text DEFAULT 'material',
  codigo text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE catalogo_composicao_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insumos of their company"
ON catalogo_composicao_insumos FOR SELECT
USING (company_id IN (
  SELECT company_id FROM user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert insumos of their company"
ON catalogo_composicao_insumos FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update insumos of their company"
ON catalogo_composicao_insumos FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM user_roles WHERE user_id = auth.uid()
))
WITH CHECK (company_id IN (
  SELECT company_id FROM user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete insumos of their company"
ON catalogo_composicao_insumos FOR DELETE
USING (company_id IN (
  SELECT company_id FROM user_roles WHERE user_id = auth.uid()
));

INSERT INTO catalogo_composicao_insumos
  (composicao_id, company_id, descricao, unidade,
   quantidade, preco_unitario, ordem)
SELECT
  c.id,
  c.company_id,
  (item->>'descricao')::text,
  (item->>'unidade')::text,
  (item->>'quantidade')::numeric,
  (item->>'preco_unitario')::numeric,
  (ordinality - 1)::integer
FROM catalogo_composicoes c,
  jsonb_array_elements(c.insumos::jsonb)
  WITH ORDINALITY AS t(item, ordinality)
WHERE c.insumos IS NOT NULL
  AND jsonb_array_length(c.insumos::jsonb) > 0;

COMMENT ON COLUMN catalogo_composicoes.insumos IS
'DEPRECATED: migrado para catalogo_composicao_insumos. Remover após atualização completa do frontend.';
