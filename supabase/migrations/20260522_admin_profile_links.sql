-- Add social/link fields to admin_profiles
-- Run in: https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm

ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS calendly_url   text,
  ADD COLUMN IF NOT EXISTS github_url     text,
  ADD COLUMN IF NOT EXISTS portfolio_url  text;

-- Allow any authenticated user to read admin_profiles.
-- Officers voluntarily fill these in; they appear on the public club Board tab.
CREATE POLICY IF NOT EXISTS "admin_profiles_readable_by_authenticated"
  ON admin_profiles FOR SELECT TO authenticated USING (true);
