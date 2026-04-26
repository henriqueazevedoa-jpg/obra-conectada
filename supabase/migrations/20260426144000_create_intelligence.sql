-- Migration: Pipeline de PDF e arquivos de projeto (SPRINT-63)

CREATE TABLE IF NOT EXISTS projeto_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  nome_original TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanho_bytes INTEGER,
  status TEXT DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'processando', 'concluido', 'erro')),
  total_paginas INTEGER,
  paginas_processadas INTEGER DEFAULT 0,
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projeto_paginas_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id UUID REFERENCES projeto_arquivos(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL,
  company_id UUID NOT NULL,
  numero_pagina INTEGER NOT NULL,
  texto_extraido TEXT,
  tabelas_json JSONB,
  tem_texto BOOLEAN DEFAULT false,
  tem_tabelas BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projeto_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_paginas_raw ENABLE ROW LEVEL SECURITY;

-- Evita erro se a política já existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projeto_arquivos' AND policyname = 'projeto_arquivos_company'
    ) THEN
        CREATE POLICY "projeto_arquivos_company" ON projeto_arquivos
          USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projeto_paginas_raw' AND policyname = 'projeto_paginas_raw_company'
    ) THEN
        CREATE POLICY "projeto_paginas_raw_company" ON projeto_paginas_raw
          USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_projeto_paginas_arquivo ON projeto_paginas_raw(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_projeto_arquivos_obra ON projeto_arquivos(obra_id);
CREATE INDEX IF NOT EXISTS idx_projeto_arquivos_status ON projeto_arquivos(status);
