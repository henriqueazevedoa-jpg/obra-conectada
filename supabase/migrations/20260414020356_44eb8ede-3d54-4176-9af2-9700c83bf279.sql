CREATE TABLE public.cronograma_dependencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  source_cat_id TEXT NOT NULL,
  target_cat_id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'FS',
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_dep_obra ON public.cronograma_dependencias(obra_id);
CREATE UNIQUE INDEX idx_cron_dep_unique ON public.cronograma_dependencias(obra_id, source_cat_id, target_cat_id);

ALTER TABLE public.cronograma_dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies" ON public.cronograma_dependencias FOR SELECT USING (true);
CREATE POLICY "Users can insert dependencies" ON public.cronograma_dependencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update dependencies" ON public.cronograma_dependencias FOR UPDATE USING (true);
CREATE POLICY "Users can delete dependencies" ON public.cronograma_dependencias FOR DELETE USING (true);