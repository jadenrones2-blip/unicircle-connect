-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update club images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete club images" ON storage.objects;

-- Create new policies that verify club ownership
-- INSERT: Only club owners can upload images to their club's folder
CREATE POLICY "Club owners can upload their club images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-images' AND
  EXISTS (
    SELECT 1 FROM public.club_owners 
    WHERE club_id = (storage.foldername(name))[1]::text
    AND user_id = auth.uid()
  )
);

-- UPDATE: Only club owners can update images in their club's folder
CREATE POLICY "Club owners can update their club images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-images' AND
  EXISTS (
    SELECT 1 FROM public.club_owners 
    WHERE club_id = (storage.foldername(name))[1]::text
    AND user_id = auth.uid()
  )
);

-- DELETE: Only club owners can delete images from their club's folder
CREATE POLICY "Club owners can delete their club images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'club-images' AND
  EXISTS (
    SELECT 1 FROM public.club_owners 
    WHERE club_id = (storage.foldername(name))[1]::text
    AND user_id = auth.uid()
  )
);