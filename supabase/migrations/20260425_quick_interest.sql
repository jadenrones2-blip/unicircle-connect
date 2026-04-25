-- Add is_quick_interest flag to distinguish one-tap interest from full applications
-- Run manually in: https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm/sql/new

ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS is_quick_interest boolean DEFAULT false;
