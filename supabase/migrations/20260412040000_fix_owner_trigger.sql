-- Fix trigger function that uses invalid enum value 'owner' instead of 'gestor'

-- Drop the trigger if it exists (on obras table)
DROP TRIGGER IF EXISTS on_obra_created ON public.obras;
DROP TRIGGER IF EXISTS auto_create_membership ON public.obras;
DROP TRIGGER IF EXISTS create_obra_membership ON public.obras;

-- Recreate or replace the function to use 'gestor'
CREATE OR REPLACE FUNCTION public.auto_create_obra_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.obra_memberships (obra_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'gestor')
  ON CONFLICT (obra_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_obra_created
  AFTER INSERT ON public.obras
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_obra_membership();
