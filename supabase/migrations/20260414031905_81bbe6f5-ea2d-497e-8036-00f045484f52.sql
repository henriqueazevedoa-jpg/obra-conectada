
CREATE TABLE public.documentos_obra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  categoria text,
  descricao text,
  arquivo_url text DEFAULT '',
  arquivo_nome text,
  arquivo_tipo text,
  tamanho_bytes bigint DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documentos" ON public.documentos_obra FOR SELECT USING (true);
CREATE POLICY "Users can insert documentos" ON public.documentos_obra FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update documentos" ON public.documentos_obra FOR UPDATE USING (true);
CREATE POLICY "Users can delete documentos" ON public.documentos_obra FOR DELETE USING (true);
