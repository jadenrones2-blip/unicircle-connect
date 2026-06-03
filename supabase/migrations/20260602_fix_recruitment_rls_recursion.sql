-- Fix: "infinite recursion detected in policy for relation club_officers"
--
-- Root cause: the recruitment_settings_write policy queries club_officers
-- directly. PostgreSQL then evaluates club_officers' own RLS policies, which
-- can chain back — causing infinite recursion.
--
-- Fix: wrap both ownership checks in SECURITY DEFINER functions. These run
-- as the DB owner and bypass RLS on the inner query, breaking the cycle.
--
-- Run in main Supabase dashboard: xvaoxmqmnmhbnpwobpmm

-- ── 1. Helper: is this user an owner of the given club? ───────────────
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

-- ── 2. Helper: is this user an officer of the given club? ─────────────
CREATE OR REPLACE FUNCTION public.is_club_officer_of(p_club_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_officers
    WHERE lower(trim(club_id)) = lower(trim(p_club_id))
      AND user_id = p_user_id
  );
$$;

-- ── 3. Recreate recruitment_settings_write using the helper functions ──
DROP POLICY IF EXISTS "recruitment_settings_write" ON public.recruitment_settings;

CREATE POLICY "recruitment_settings_write" ON public.recruitment_settings
  FOR ALL TO authenticated
  USING (
    public.is_club_owner_of(recruitment_settings.club_id, auth.uid())
    OR public.is_club_officer_of(recruitment_settings.club_id, auth.uid())
  )
  WITH CHECK (
    public.is_club_owner_of(recruitment_settings.club_id, auth.uid())
    OR public.is_club_officer_of(recruitment_settings.club_id, auth.uid())
  );

NOTIFY pgrst, 'reload schema';
