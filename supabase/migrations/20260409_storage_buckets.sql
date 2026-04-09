-- Create club-images bucket in main Supabase project
-- Used by: EventImageUpload (event photos) and AdminProfileSettings (admin avatars)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-images',
  'club-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload club images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'club-images');

-- Allow authenticated users to update (upsert)
create policy "Authenticated users can update club images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'club-images');

-- Allow authenticated users to delete their own uploads
create policy "Authenticated users can delete club images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'club-images');

-- Public read access
create policy "Public can read club images"
  on storage.objects for select
  to public
  using (bucket_id = 'club-images');
