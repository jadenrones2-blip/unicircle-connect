-- Extend admin_profiles with role-specific and contact fields
-- Run in: https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm

ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS bio              text,
  ADD COLUMN IF NOT EXISTS major            text,
  ADD COLUMN IF NOT EXISTS graduation_year  text,
  ADD COLUMN IF NOT EXISTS linkedin_url     text,
  ADD COLUMN IF NOT EXISTS phone            text;
