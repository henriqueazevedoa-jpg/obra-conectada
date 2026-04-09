-- Add unique constraint on obra_memberships for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS obra_memberships_user_obra_unique ON public.obra_memberships (user_id, obra_id);