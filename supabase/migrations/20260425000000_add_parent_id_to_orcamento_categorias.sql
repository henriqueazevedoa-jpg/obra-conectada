-- Adiciona suporte a Subetapas (N-Níveis)
ALTER TABLE public.orcamento_categorias 
ADD COLUMN parent_id UUID REFERENCES public.orcamento_categorias(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de busca recursiva
CREATE INDEX idx_orcamento_categorias_parent_id ON public.orcamento_categorias(parent_id);
