-- Add avatar_url column to applicants table
-- The applicants table was originally created without this column.
-- ClubApply.tsx uploads a profile photo to the avatars bucket and stores
-- the public URL here so it can be displayed in the kanban and drawer.
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;
