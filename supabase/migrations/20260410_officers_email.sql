-- Add email column to club_officers table
-- Stored at claim time (AcceptInvite.tsx) so InviteTeamPanel can display
-- the officer's email without needing a join to auth.users.
ALTER TABLE public.club_officers ADD COLUMN IF NOT EXISTS email text;
