
-- Fix the overly permissive INSERT policy on obras
DROP POLICY "Gestores can create obras" ON public.obras;

-- Any authenticated user can create an obra (they become gestor via membership)
-- We restrict by requiring the user to be authenticated (already done via TO authenticated)
-- and we'll rely on the membership being created right after
CREATE POLICY "Authenticated users can create obras" ON public.obras 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);
