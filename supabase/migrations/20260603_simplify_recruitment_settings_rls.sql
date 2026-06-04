-- Simplify recruitment_settings write policy: owner-only, no officer check.
-- Removes all the complexity that was causing infinite recursion.
-- Run in main Supabase dashboard: xvaoxmqmnmhbnpwobpmm

DROP POLICY IF EXISTS "recruitment_settings_write" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can view their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can insert their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can update their recruitment settings" ON public.recruitment_settings;

-- Simple: any authenticated user who owns this club can read/write its settings.
-- Uses a direct subquery against club_owners only (no club_officers, no recursion).
CREATE POLICY "recruitment_settings_write" ON public.recruitment_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE lower(trim(club_id)) = lower(trim(recruitment_settings.club_id))
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE lower(trim(club_id)) = lower(trim(recruitment_settings.club_id))
        AND user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
