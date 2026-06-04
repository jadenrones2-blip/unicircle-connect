-- Fix recruitment_stages RLS so fetchStages returns data after insert.
--
-- Root cause: no open SELECT policy exists on recruitment_stages, so
-- fetchStages() returns empty after a successful INSERT — the wizard
-- sees hasStages=false and never transitions to the kanban.
--
-- Also replaces any write policy that references club_officers directly
-- (which causes infinite recursion) with a SECURITY DEFINER approach.
--
-- Run in main Supabase dashboard: xvaoxmqmnmhbnpwobpmm

-- ── 1. Open SELECT so anyone can read stages ──────────────────────────
DROP POLICY IF EXISTS "recruitment_stages_read" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can view their recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Students can view stages for clubs they applied to" ON public.recruitment_stages;

CREATE POLICY "recruitment_stages_read" ON public.recruitment_stages
  FOR SELECT TO anon, authenticated USING (true);

-- ── 2. Reuse SECURITY DEFINER helper (created in earlier migration) ───
--    Re-declare here so this file is safe to run standalone.
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

-- ── 3. Replace write policy with one that can't recurse ───────────────
DROP POLICY IF EXISTS "recruitment_stages_write" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can insert recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can update their recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can delete their recruitment stages" ON public.recruitment_stages;

CREATE POLICY "recruitment_stages_write" ON public.recruitment_stages
  FOR ALL TO authenticated
  USING (public.is_club_owner_of(recruitment_stages.club_id, auth.uid()))
  WITH CHECK (public.is_club_owner_of(recruitment_stages.club_id, auth.uid()));

NOTIFY pgrst, 'reload schema';
