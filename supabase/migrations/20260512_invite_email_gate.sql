-- Add email gate to club_invites
-- Run in Supabase dashboard: supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm

ALTER TABLE club_invites
  ADD COLUMN IF NOT EXISTS invited_email text;
