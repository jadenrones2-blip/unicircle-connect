-- Add is_standout flag to applicants table
-- Run this in the Supabase dashboard SQL editor

ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS is_standout boolean DEFAULT false;
