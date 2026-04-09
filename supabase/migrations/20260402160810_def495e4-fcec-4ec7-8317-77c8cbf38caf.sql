
-- 1. Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome_comercial text NOT NULL,
  descricao text DEFAULT '',
  limite_obras integer NOT NULL DEFAULT 0,
  limite_gestores integer NOT NULL DEFAULT 0,
  limite_funcionarios integer NOT NULL DEFAULT 0,
  limite_clientes integer NOT NULL DEFAULT 0,
  ilimitado boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  features jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plans" ON public.plans
  FOR SELECT USING (true);

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text DEFAULT '',
  email text DEFAULT '',
  telefone text DEFAULT '',
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'teste',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial',
  ciclo text NOT NULL DEFAULT 'mensal',
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  valor_base numeric DEFAULT 0,
  moeda text DEFAULT 'BRL',
  gateway_id text,
  trial_start date,
  trial_end date,
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create subscription_extras table
CREATE TABLE public.subscription_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text DEFAULT '',
  quantidade integer DEFAULT 1,
  valor_unitario numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_extras ENABLE ROW LEVEL SECURITY;

-- 5. Add company_id to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 6. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_plan_limit(_company_id uuid, _resource text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan plans%ROWTYPE;
  _current_count integer;
  _limit integer;
  _allowed boolean;
BEGIN
  SELECT p.* INTO _plan
  FROM plans p
  JOIN companies c ON c.plan_id = p.id
  WHERE c.id = _company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Empresa sem plano');
  END IF;

  IF _plan.ilimitado THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1, 'plan', _plan.nome_comercial);
  END IF;

  CASE _resource
    WHEN 'obras' THEN
      SELECT count(*) INTO _current_count FROM obras WHERE company_id = _company_id AND status != 'concluida';
      _limit := _plan.limite_obras;
    WHEN 'gestores' THEN
      SELECT count(*) INTO _current_count FROM user_roles WHERE company_id = _company_id AND role = 'gestor';
      _limit := _plan.limite_gestores;
    WHEN 'funcionarios' THEN
      SELECT count(*) INTO _current_count FROM user_roles WHERE company_id = _company_id AND role = 'funcionario';
      _limit := _plan.limite_funcionarios;
    WHEN 'clientes' THEN
      SELECT count(*) INTO _current_count FROM user_roles WHERE company_id = _company_id AND role = 'cliente';
      _limit := _plan.limite_clientes;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Recurso desconhecido');
  END CASE;

  _allowed := _current_count < _limit;
  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current', _current_count,
    'limit', _limit,
    'plan', _plan.nome_comercial,
    'reason', CASE WHEN NOT _allowed THEN 'Limite do plano ' || _plan.nome_comercial || ' atingido' ELSE NULL END
  );
END;
$$;

-- 7. RLS for companies
CREATE POLICY "Members view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = get_user_company_id() OR is_platform_admin());

CREATE POLICY "Admin manage companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Admin delete companies" ON public.companies
  FOR DELETE TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Auth can create company" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. RLS for subscriptions
CREATE POLICY "Members view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() OR is_platform_admin());

CREATE POLICY "Admin insert subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin() OR company_id = get_user_company_id());

CREATE POLICY "Admin update subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Admin delete subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (is_platform_admin());

-- 9. RLS for subscription_extras
CREATE POLICY "Members view own extras" ON public.subscription_extras
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE company_id = get_user_company_id())
    OR is_platform_admin()
  );

CREATE POLICY "Admin manage extras" ON public.subscription_extras
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

CREATE POLICY "Admin update extras" ON public.subscription_extras
  FOR UPDATE TO authenticated
  USING (is_platform_admin());

CREATE POLICY "Admin delete extras" ON public.subscription_extras
  FOR DELETE TO authenticated
  USING (is_platform_admin());

-- 10. Seed plans
INSERT INTO public.plans (slug, nome_comercial, descricao, limite_obras, limite_gestores, limite_funcionarios, limite_clientes, ilimitado) VALUES
  ('start', 'Start', 'Ideal para profissionais autônomos e pequenas empresas iniciando o controle digital da obra.', 2, 1, 2, 2, false),
  ('pro', 'Pro', 'Ideal para empresas com mais de uma obra em andamento e equipe um pouco maior.', 5, 2, 4, 4, false),
  ('enterprise', 'Enterprise', 'Ideal para empresas com operação maior e necessidade de escala.', 0, 0, 0, 0, true);
