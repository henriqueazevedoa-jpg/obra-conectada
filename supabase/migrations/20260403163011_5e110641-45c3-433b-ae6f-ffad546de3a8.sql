
-- 1. Update Pro plan limits
UPDATE public.plans SET 
  limite_obras = 10, 
  limite_gestores = 3, 
  limite_funcionarios = 5, 
  limite_clientes = 5
WHERE slug = 'pro';

-- 2. Company permission overrides
CREATE TABLE public.company_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  max_obras integer,
  max_gestores integer,
  max_funcionarios integer,
  max_clientes integer,
  ilimitado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.company_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own overrides" ON public.company_permission_overrides
  FOR SELECT USING (company_id = get_user_company_id() OR is_platform_admin());

CREATE POLICY "Admin manage overrides" ON public.company_permission_overrides
  FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "Admin update overrides" ON public.company_permission_overrides
  FOR UPDATE USING (is_platform_admin());

CREATE POLICY "Admin delete overrides" ON public.company_permission_overrides
  FOR DELETE USING (is_platform_admin());

-- 3. Addon catalog
CREATE TABLE public.addon_catalog (
  code text PRIMARY KEY,
  nome text NOT NULL,
  descricao text DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view addons" ON public.addon_catalog
  FOR SELECT USING (true);

-- Seed voice_ai addon
INSERT INTO public.addon_catalog (code, nome, descricao)
VALUES ('voice_ai', 'Assistente por Voz IA', 'Permite entrada de dados por áudio com transcrição e interpretação automática por IA.');

-- 4. Company addons
CREATE TABLE public.company_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  addon_code text NOT NULL REFERENCES public.addon_catalog(code),
  status text NOT NULL DEFAULT 'inactive',
  trial_start date,
  trial_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, addon_code)
);

ALTER TABLE public.company_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own addons" ON public.company_addons
  FOR SELECT USING (company_id = get_user_company_id() OR is_platform_admin());

CREATE POLICY "Admin manage addons" ON public.company_addons
  FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "Admin update addons" ON public.company_addons
  FOR UPDATE USING (is_platform_admin());

CREATE POLICY "Admin delete addons" ON public.company_addons
  FOR DELETE USING (is_platform_admin());

-- 5. Voice inputs
CREATE TABLE public.voice_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  module_origin text NOT NULL,
  audio_path text,
  transcription text,
  parsed_json jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own voice inputs" ON public.voice_inputs
  FOR SELECT USING (company_id = get_user_company_id() OR is_platform_admin());

CREATE POLICY "Members insert voice inputs" ON public.voice_inputs
  FOR INSERT WITH CHECK (company_id = get_user_company_id() AND user_id = auth.uid());

-- 6. Storage bucket for audio
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-audio', 'voice-audio', false);

CREATE POLICY "Users upload own audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'voice-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Update check_plan_limit to use overrides
CREATE OR REPLACE FUNCTION public.check_plan_limit(_company_id uuid, _resource text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan plans%ROWTYPE;
  _override company_permission_overrides%ROWTYPE;
  _current_count integer;
  _limit integer;
  _allowed boolean;
  _has_override boolean := false;
BEGIN
  -- Check overrides first
  SELECT * INTO _override FROM company_permission_overrides WHERE company_id = _company_id;
  IF FOUND THEN
    _has_override := true;
    IF _override.ilimitado THEN
      RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1, 'plan', 'Override Ilimitado');
    END IF;
  END IF;

  -- Get plan
  SELECT p.* INTO _plan
  FROM plans p JOIN companies c ON c.plan_id = p.id
  WHERE c.id = _company_id;

  IF NOT FOUND AND NOT _has_override THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Empresa sem plano');
  END IF;

  IF NOT _has_override AND _plan.ilimitado THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1, 'plan', _plan.nome_comercial);
  END IF;

  CASE _resource
    WHEN 'obras' THEN
      SELECT count(*) INTO _current_count FROM obras WHERE company_id = _company_id AND status != 'concluida';
      _limit := COALESCE(_override.max_obras, _plan.limite_obras);
    WHEN 'gestores' THEN
      SELECT count(*) INTO _current_count FROM user_roles WHERE company_id = _company_id AND role = 'gestor';
      _limit := COALESCE(_override.max_gestores, _plan.limite_gestores);
    WHEN 'funcionarios' THEN
      SELECT count(*) INTO _current_count FROM user_roles WHERE company_id = _company_id AND role = 'funcionario';
      _limit := COALESCE(_override.max_funcionarios, _plan.limite_funcionarios);
    WHEN 'clientes' THEN
      SELECT count(*) INTO _current_count FROM user_roles WHERE company_id = _company_id AND role = 'cliente';
      _limit := COALESCE(_override.max_clientes, _plan.limite_clientes);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Recurso desconhecido');
  END CASE;

  _allowed := _current_count < _limit;
  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current', _current_count,
    'limit', _limit,
    'plan', COALESCE(_plan.nome_comercial, 'Custom'),
    'reason', CASE WHEN NOT _allowed THEN 'Limite atingido (' || _current_count || '/' || _limit || ')' ELSE NULL END
  );
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_company_permission_overrides_updated_at
  BEFORE UPDATE ON public.company_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_addons_updated_at
  BEFORE UPDATE ON public.company_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
