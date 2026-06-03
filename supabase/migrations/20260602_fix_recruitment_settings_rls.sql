-- Fix recruitment_settings RLS: normalize existing club_ids and switch to
-- case-insensitive comparison so casing differences can't block owners.
-- Run in main Supabase dashboard: xvaoxmqmnmhbnpwobpmm

-- ── 1. Normalize club_id in recruitment_settings ──────────────────────
UPDATE public.recruitment_settings
SET club_id = lower(trim(club_id))
WHERE club_id != lower(trim(club_id));

-- ── 2. Normalize club_id in recruitment_stages (safety net) ───────────
UPDATE public.recruitment_stages
SET club_id = lower(trim(club_id))
WHERE club_id != lower(trim(club_id));

-- ── 3. Replace recruitment_settings policies with case-insensitive ones ─
DROP POLICY IF EXISTS "Club owners can view their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can insert their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can update their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "recruitment_settings_read" ON public.recruitment_settings;
DROP POLICY IF EXISTS "recruitment_settings_write" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Students can view settings for clubs they applied to" ON public.recruitment_settings;

CREATE POLICY "recruitment_settings_read" ON public.recruitment_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "recruitment_settings_write" ON public.recruitment_settings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE lower(trim(club_id)) = lower(trim(recruitment_settings.club_id))
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.club_officers
      WHERE lower(trim(club_id)) = lower(trim(recruitment_settings.club_id))
        AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE lower(trim(club_id)) = lower(trim(recruitment_settings.club_id))
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.club_officers
      WHERE lower(trim(club_id)) = lower(trim(recruitment_settings.club_id))
        AND user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

-- Verify
SELECT id, club_id, is_enabled FROM public.recruitment_settings ORDER BY created_at;
