CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  modulo text NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id, modulo)
);

ALTER TABLE public.user_module_permissions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor gerencia permissoes"
  ON public.user_module_permissions FOR ALL
  USING (company_id = public.get_user_company_id());
