-- Add obras_ids to company_user_invites and user_roles
ALTER TABLE public.company_user_invites ADD COLUMN IF NOT EXISTS obras_ids UUID[] DEFAULT '{}';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS obras_ids UUID[] DEFAULT '{}';

-- Replace handle_new_user to process pending invites
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  invite_record record;
begin
  -- Check if there's a pending invite for this email (most recent first)
  select * into invite_record
  from public.company_user_invites
  where email = new.email and status = 'pending'
  order by created_at desc
  limit 1;

  if found then
    -- User was invited
    insert into public.profiles (user_id, nome, email, company_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'nome', invite_record.nome, ''),
      new.email,
      invite_record.company_id
    )
    on conflict (user_id) do update
      set nome = excluded.nome, email = excluded.email, company_id = excluded.company_id;

    insert into public.user_roles (user_id, role, company_id, obras_ids)
    values (new.id, invite_record.role, invite_record.company_id, coalesce(invite_record.obras_ids, '{}'))
    on conflict (user_id) do update
      set role = excluded.role, company_id = excluded.company_id, obras_ids = excluded.obras_ids;

    -- Update invite status
    update public.company_user_invites
    set status = 'accepted', accepted_at = now()
    where id = invite_record.id;
  else
    -- Standard user (self-signup)
    insert into public.profiles (user_id, nome, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'nome', ''),
      new.email
    )
    on conflict (user_id) do update
      set nome = excluded.nome, email = excluded.email;

    insert into public.user_roles (user_id, role)
    values (new.id, 'gestor')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;