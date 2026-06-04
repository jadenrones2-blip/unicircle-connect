-- Definitive fix for infinite recursion on recruitment_settings upsert.
--
-- Root cause: club_owners has a SELECT policy that queries club_officers,
-- and club_officers' policy queries back — any direct subquery against
-- club_owners from within an RLS policy triggers this cycle.
--
-- Fix: SECURITY DEFINER function bypasses RLS entirely on the inner
-- club_owners lookup, so the chain never starts.
--
-- Run in main Supabase dashboard: xvaoxmqmnmhbnpwobpmm

-- ── 1. Ensure the SECURITY DEFINER helper exists ──────────────────────
CREATE OR REPLACE FUNCTION public.is_club_owner_of(p_club_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE lower(trim(club_id)) = lower(trim(p_club_id))
      AND user_id = p_user_id
  );
$$;

-- ── 2. Recreate policy using the helper — no direct table subquery ────
DROP POLICY IF EXISTS "recruitment_settings_write" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can insert their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can update their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can view their recruitment settings" ON public.recruitment_settings;

CREATE POLICY "recruitment_settings_write" ON public.recruitment_settings
  FOR ALL TO authenticated
  USING (public.is_club_owner_of(recruitment_settings.club_id, auth.uid()))
  WITH CHECK (public.is_club_owner_of(recruitment_settings.club_id, auth.uid()));

NOTIFY pgrst, 'reload schema';
