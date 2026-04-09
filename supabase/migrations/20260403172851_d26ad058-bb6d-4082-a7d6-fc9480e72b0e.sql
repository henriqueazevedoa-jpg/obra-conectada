
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('work-files', 'work-files', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('daily-attachments', 'daily-attachments', false) ON CONFLICT (id) DO NOTHING;

-- Policies for work-files
CREATE POLICY "Auth users can upload work files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'work-files');

CREATE POLICY "Auth users can view work files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'work-files');

CREATE POLICY "Auth users can delete own work files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'work-files');

-- Policies for daily-attachments
CREATE POLICY "Auth users can upload daily attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'daily-attachments');

CREATE POLICY "Auth users can view daily attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'daily-attachments');

CREATE POLICY "Auth users can delete own daily attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'daily-attachments');
