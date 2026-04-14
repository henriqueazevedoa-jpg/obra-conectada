
CREATE TABLE public.insumos_pendentes_cotacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL,
  subitem_id UUID NULL,
  material_id UUID NULL,
  nome_insumo TEXT NOT NULL,
  unidade TEXT NULL,
  categoria TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insumos_pendentes_cotacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insumos pendentes"
  ON public.insumos_pendentes_cotacao FOR SELECT USING (true);

CREATE POLICY "Users can insert insumos pendentes"
  ON public.insumos_pendentes_cotacao FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update insumos pendentes"
  ON public.insumos_pendentes_cotacao FOR UPDATE USING (true);

CREATE POLICY "Users can delete insumos pendentes"
  ON public.insumos_pendentes_cotacao FOR DELETE USING (true);

CREATE INDEX idx_insumos_pendentes_obra ON public.insumos_pendentes_cotacao(obra_id);
CREATE INDEX idx_insumos_pendentes_status ON public.insumos_pendentes_cotacao(status);
