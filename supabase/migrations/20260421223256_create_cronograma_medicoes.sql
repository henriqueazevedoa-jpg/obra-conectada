-- Create cronograma_medicoes
CREATE TABLE IF NOT EXISTS public.cronograma_medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  status text NOT NULL DEFAULT 'confirmada',
  observacao text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create cronograma_medicao_itens
CREATE TABLE IF NOT EXISTS public.cronograma_medicao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicao_id uuid NOT NULL REFERENCES public.cronograma_medicoes(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.cronograma_tarefas(id) ON DELETE CASCADE,
  percentual_anterior numeric NOT NULL DEFAULT 0,
  percentual_novo numeric NOT NULL,
  quantidade_executada numeric,
  observacao text
);

-- Enable RLS
ALTER TABLE public.cronograma_medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_medicao_itens ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Membros gerenciam suas medicoes" 
  ON public.cronograma_medicoes
  FOR ALL 
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Membros gerenciam itens de medicao" 
  ON public.cronograma_medicao_itens
  FOR ALL 
  USING (medicao_id IN (SELECT id FROM public.cronograma_medicoes WHERE company_id = public.get_user_company_id()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cronograma_medicoes_obra ON public.cronograma_medicoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_medicoes_company ON public.cronograma_medicoes(company_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_medicao_itens_medicao ON public.cronograma_medicao_itens(medicao_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_medicao_itens_tarefa ON public.cronograma_medicao_itens(tarefa_id);
