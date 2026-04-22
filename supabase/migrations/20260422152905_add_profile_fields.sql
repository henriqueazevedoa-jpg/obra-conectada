-- Add professional fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS registro_conselho text,
  ADD COLUMN IF NOT EXISTS conselho_tipo text DEFAULT 'CREA';

-- Ensure avatars bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS for Avatars Bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Avatar images are publicly accessible.'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible." 
        ON storage.objects FOR SELECT 
        USING ( bucket_id = 'avatars' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can upload their own avatar.'
    ) THEN
        CREATE POLICY "Users can upload their own avatar." 
        ON storage.objects FOR INSERT 
        WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own avatar.'
    ) THEN
        CREATE POLICY "Users can update their own avatar." 
        ON storage.objects FOR UPDATE 
        USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete their own avatar.'
    ) THEN
        CREATE POLICY "Users can delete their own avatar." 
        ON storage.objects FOR DELETE 
        USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
    END IF;
END
$$;
