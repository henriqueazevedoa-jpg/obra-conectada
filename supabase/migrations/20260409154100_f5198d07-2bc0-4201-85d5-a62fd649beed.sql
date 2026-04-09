
-- Table for company user invites
CREATE TABLE public.company_user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'funcionario',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_user_invites ENABLE ROW LEVEL SECURITY;

-- Gestors/admins of the company can view invites
CREATE POLICY "Members view own invites" ON public.company_user_invites
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() OR is_platform_admin());

-- Gestors can create invites for their company
CREATE POLICY "Gestors insert invites" ON public.company_user_invites
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND invited_by = auth.uid());

-- Gestors can update invites (cancel etc)
CREATE POLICY "Gestors update invites" ON public.company_user_invites
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() OR is_platform_admin());

-- Gestors can delete invites
CREATE POLICY "Gestors delete invites" ON public.company_user_invites
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() OR is_platform_admin());

-- Allow company members to view profiles of people in the same company
CREATE POLICY "Company members view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() OR is_platform_admin());

-- Allow admins to view all user_roles
CREATE POLICY "Admin view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (is_platform_admin());

-- Allow company members to view roles of same company
CREATE POLICY "Company members view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
