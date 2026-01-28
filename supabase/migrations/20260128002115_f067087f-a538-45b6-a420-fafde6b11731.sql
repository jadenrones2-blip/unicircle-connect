-- Create storage bucket for club images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('club-images', 'club-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view club images (public bucket)
CREATE POLICY "Club images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-images');

-- Allow authenticated users to upload club images
CREATE POLICY "Authenticated users can upload club images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'club-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update club images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'club-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete club images
CREATE POLICY "Authenticated users can delete club images"
ON storage.objects FOR DELETE
USING (bucket_id = 'club-images' AND auth.role() = 'authenticated');