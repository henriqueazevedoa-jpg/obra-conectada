CREATE TABLE IF NOT EXISTS projeto_quantitativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  disciplina text NOT NULL,
  tipo text NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}',
  fonte text NOT NULL,
  confianca text CHECK (confianca IN ('alta', 'media', 'baixa')),
  conflitos jsonb DEFAULT '[]',
  versao_projeto text,
  consolidado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quantitativos_obra ON projeto_quantitativos(obra_id);
CREATE INDEX IF NOT EXISTS idx_quantitativos_disciplina ON projeto_quantitativos(obra_id, disciplina);
CREATE INDEX IF NOT EXISTS idx_quantitativos_dados ON projeto_quantitativos USING gin(dados);

ALTER TABLE obras ADD COLUMN IF NOT EXISTS quantitativos_status text DEFAULT 'nao_gerado' CHECK (quantitativos_status IN ('nao_gerado', 'gerando', 'concluido', 'erro'));
ALTER TABLE obras ADD COLUMN IF NOT EXISTS quantitativos_gerados_em timestamptz;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS quantitativos_creditos_consumidos numeric(10,4) DEFAULT 0;
