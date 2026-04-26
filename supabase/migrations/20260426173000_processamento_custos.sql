CREATE TABLE IF NOT EXISTS processamento_custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id uuid REFERENCES projeto_arquivos(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  company_id uuid NOT NULL,
  fase text NOT NULL,
  modelo text NOT NULL,
  tokens_entrada integer DEFAULT 0,
  tokens_saida integer DEFAULT 0,
  unidades integer DEFAULT 0,
  custo_usd numeric(10,6) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processamento_custos_arquivo ON processamento_custos(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_processamento_custos_obra ON processamento_custos(obra_id);
CREATE INDEX IF NOT EXISTS idx_processamento_custos_company ON processamento_custos(company_id);
