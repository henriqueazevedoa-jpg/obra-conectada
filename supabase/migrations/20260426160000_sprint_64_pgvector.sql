-- Migration: SPRINT-64 - Classificação e pgvector

CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar campo na tabela projeto_arquivos (sem quebrar tabelas antigas)
ALTER TABLE projeto_arquivos ADD COLUMN IF NOT EXISTS classificado BOOLEAN DEFAULT false;

-- Tabela de chunks indexados para busca semântica
CREATE TABLE IF NOT EXISTS projeto_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id UUID REFERENCES projeto_arquivos(id) ON DELETE CASCADE,
  pagina_raw_id UUID REFERENCES projeto_paginas_raw(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL,
  company_id UUID NOT NULL,

  -- Conteúdo
  numero_pagina INTEGER NOT NULL,
  texto TEXT NOT NULL,
  tabelas_json JSONB,

  -- Classificação do Sonnet
  disciplina TEXT CHECK (disciplina IN (
    'arquitetonico', 'estrutural', 'hidraulico',
    'eletrico', 'avac', 'paisagismo', 'indeterminado'
  )),
  tipo_conteudo TEXT CHECK (tipo_conteudo IN (
    'tabela_quantitativo', 'tabela_especificacao',
    'planta_baixa', 'corte_elevacao', 'detalhe',
    'memorial', 'capa_indice', 'carimbo_legenda', 'outro'
  )),
  relevancia TEXT CHECK (relevancia IN ('alta', 'media', 'baixa', 'descartar')),
  resumo TEXT,
  confianca TEXT CHECK (confianca IN ('alta', 'media', 'baixa')),
  pagina_par INTEGER,
  entidades_extraidas JSONB,

  -- Busca vetorial
  embedding vector(1536),

  -- Controle
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id_idx UUID GENERATED ALWAYS AS (company_id) STORED
);

ALTER TABLE projeto_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projeto_chunks' AND policyname = 'projeto_chunks_company'
    ) THEN
        CREATE POLICY "projeto_chunks_company" ON projeto_chunks
          USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
    END IF;
END
$$;

-- Criar índices vetoriais usando a nova sintaxe e de texto
CREATE INDEX IF NOT EXISTS idx_projeto_chunks_embedding ON projeto_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_projeto_chunks_obra ON projeto_chunks(obra_id);
CREATE INDEX IF NOT EXISTS idx_projeto_chunks_disciplina ON projeto_chunks(disciplina);
CREATE INDEX IF NOT EXISTS idx_projeto_chunks_relevancia ON projeto_chunks(relevancia);
CREATE INDEX IF NOT EXISTS idx_projeto_chunks_arquivo ON projeto_chunks(arquivo_id);

-- Função para busca semântica (usada pelo chat no Sprint 65)
CREATE OR REPLACE FUNCTION buscar_chunks_obra(
  query_embedding vector(1536),
  p_obra_id UUID,
  p_company_id UUID,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  texto TEXT,
  disciplina TEXT,
  tipo_conteudo TEXT,
  numero_pagina INTEGER,
  resumo TEXT,
  confianca TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    texto,
    disciplina,
    tipo_conteudo,
    numero_pagina,
    resumo,
    confianca,
    1 - (embedding <=> query_embedding) AS similarity
  FROM projeto_chunks
  WHERE obra_id = p_obra_id
    AND company_id = p_company_id
    AND relevancia != 'descartar'
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
