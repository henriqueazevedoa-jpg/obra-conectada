-- 1. Add engenheiro to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'engenheiro';

-- 2. Update existing rows
UPDATE public.user_roles SET role = 'engenheiro' WHERE role = 'funcionario';
UPDATE public.company_user_invites SET role = 'engenheiro' WHERE role = 'funcionario';

-- 3. Replace check_plan_limit
CREATE OR REPLACE FUNCTION public.check_plan_limit(_company_id uuid, _resource text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.plans%rowtype;
  v_override public.company_permission_overrides%rowtype;
  v_current integer := 0;
  v_limit integer := 0;
  v_plan_name text := '';
begin
  select p.* into v_plan
  from public.companies c
  join public.plans p on p.id = c.plan_id
  where c.id = _company_id;

  select * into v_override
  from public.company_permission_overrides
  where company_id = _company_id;

  v_plan_name := coalesce(v_plan.nome_comercial, '');

  if coalesce(v_override.ilimitado, false) or coalesce(v_plan.ilimitado, false) then
    return jsonb_build_object(
      'allowed', true,
      'current', 0,
      'limit', 999999,
      'plan', v_plan_name
    );
  end if;

  if _resource = 'obras' then
    select count(*) into v_current
    from public.obras
    where company_id = _company_id;
    v_limit := coalesce(v_override.max_obras, v_plan.limite_obras);

  elsif _resource = 'gestores' then
    select count(*) into v_current
    from public.user_roles ur
    where ur.company_id = _company_id
      and ur.role = 'gestor';
    v_limit := coalesce(v_override.max_gestores, v_plan.limite_gestores);

  elsif _resource = 'engenheiros' or _resource = 'funcionarios' then
    select count(*) into v_current
    from public.user_roles ur
    where ur.company_id = _company_id
      and ur.role = 'engenheiro';
    v_limit := coalesce(v_override.max_funcionarios, v_plan.limite_funcionarios);

  else
    return jsonb_build_object(
      'allowed', false,
      'current', 0,
      'limit', 0,
      'plan', v_plan_name,
      'reason', 'Recurso inválido'
    );
  end if;

  return jsonb_build_object(
    'allowed', (v_current < coalesce(v_limit, 0)),
    'current', v_current,
    'limit', coalesce(v_limit, 0),
    'plan', v_plan_name,
    'reason', case when v_current >= coalesce(v_limit, 0) then 'Limite atingido' else null end
  );
end;
$function$;

-- 4. Trigger on obras creation
CREATE OR REPLACE FUNCTION public.handle_obra_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_my_role public.app_role;
begin
  select role into v_my_role
  from public.user_roles
  where user_id = auth.uid() and company_id = new.company_id;

  if v_my_role = 'engenheiro' then
    update public.user_roles
    set obras_ids = array_append(coalesce(obras_ids, '{}'), new.id)
    where user_id = auth.uid() and company_id = new.company_id;
  end if;

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_obra_created ON public.obras;

CREATE TRIGGER on_obra_created
  AFTER INSERT ON public.obras
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_obra_creation();