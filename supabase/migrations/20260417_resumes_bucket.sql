-- Fix: Resume upload fails because the 'resumes' storage bucket may not exist
--
-- The upload-resume edge function uses the service role key (bypasses RLS),
-- so no storage policies are needed for the bucket itself — service role has
-- full access regardless. We only need the bucket to exist.
--
-- Run this in: Supabase dashboard → project xvaoxmqmnmhbnpwobpmm → SQL editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,               -- private bucket — accessed via signed URLs
  10485760,            -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;  -- safe to re-run if bucket already exists
