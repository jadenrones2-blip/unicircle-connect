-- Add contact_email to admin_profiles so every board member's email
-- is visible internally without depending on club_officers.email
-- Run in: https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm

ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS contact_email text;
