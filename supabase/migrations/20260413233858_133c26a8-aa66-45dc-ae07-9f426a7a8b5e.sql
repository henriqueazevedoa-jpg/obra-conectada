
CREATE TABLE public.obra_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'execucao',
  descricao TEXT,
  data_programada DATE NOT NULL,
  hora_programada TIME,
  data_finalizacao TIMESTAMPTZ,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'programado',
  prioridade TEXT NOT NULL DEFAULT 'media',
  local TEXT,
  alerta_ativo BOOLEAN NOT NULL DEFAULT false,
  antecedencia_alerta_em_dias INTEGER,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agenda items" ON public.obra_agenda FOR SELECT USING (true);
CREATE POLICY "Users can insert agenda items" ON public.obra_agenda FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update agenda items" ON public.obra_agenda FOR UPDATE USING (true);
CREATE POLICY "Users can delete agenda items" ON public.obra_agenda FOR DELETE USING (true);

CREATE INDEX idx_obra_agenda_obra_id ON public.obra_agenda(obra_id);
CREATE INDEX idx_obra_agenda_data ON public.obra_agenda(data_programada);
CREATE INDEX idx_obra_agenda_status ON public.obra_agenda(status);
