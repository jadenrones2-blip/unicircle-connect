-- Complete RLS audit for officer access
-- Officers should have identical recruitment access to owners
-- Run in main Supabase dashboard: xvaoxmqmnmhbnpwobpmm

-- ── recruitment_stages ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Club owners can view their recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can insert recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can update their recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "Club owners can delete their recruitment stages" ON public.recruitment_stages;
DROP POLICY IF EXISTS "recruitment_stages_read" ON public.recruitment_stages;

CREATE POLICY "recruitment_stages_read" ON public.recruitment_stages
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "recruitment_stages_write" ON public.recruitment_stages
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_stages.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_stages.club_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_stages.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_stages.club_id AND user_id = auth.uid())
  );

-- ── recruitment_settings ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Club owners can view their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can insert their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Club owners can update their recruitment settings" ON public.recruitment_settings;
DROP POLICY IF EXISTS "recruitment_settings_read" ON public.recruitment_settings;

CREATE POLICY "recruitment_settings_read" ON public.recruitment_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "recruitment_settings_write" ON public.recruitment_settings
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_settings.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_settings.club_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_settings.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_settings.club_id AND user_id = auth.uid())
  );

-- ── applicants ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Club owners can view their applicants" ON public.applicants;
DROP POLICY IF EXISTS "Club owners can insert applicants" ON public.applicants;
DROP POLICY IF EXISTS "Club owners can update their applicants" ON public.applicants;
DROP POLICY IF EXISTS "Club owners can delete their applicants" ON public.applicants;
DROP POLICY IF EXISTS "officers_can_read_applicants" ON public.applicants;
DROP POLICY IF EXISTS "applicants_insert_public" ON public.applicants;

CREATE POLICY "applicants_insert_public" ON public.applicants
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "applicants_read" ON public.applicants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = applicants.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = applicants.club_id AND user_id = auth.uid())
  );

CREATE POLICY "applicants_update" ON public.applicants
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = applicants.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = applicants.club_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = applicants.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = applicants.club_id AND user_id = auth.uid())
  );

CREATE POLICY "applicants_delete" ON public.applicants
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = applicants.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = applicants.club_id AND user_id = auth.uid())
  );

-- ── deliberation_votes ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Officers can manage their own votes" ON public.deliberation_votes;
DROP POLICY IF EXISTS "Owners can read all votes for their club" ON public.deliberation_votes;
DROP POLICY IF EXISTS "deliberation_votes_all" ON public.deliberation_votes;

CREATE POLICY "deliberation_votes_all" ON public.deliberation_votes
  FOR ALL TO authenticated USING (
    officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.applicants a
      WHERE a.id = deliberation_votes.applicant_id
      AND (
        EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = a.club_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = a.club_id AND user_id = auth.uid())
      )
    )
  ) WITH CHECK (officer_id = auth.uid());

-- ── officer_rubric_scores ────────────────────────────────────────────
DROP POLICY IF EXISTS "Officers can manage their own scores" ON public.officer_rubric_scores;
DROP POLICY IF EXISTS "Club members can read all scores" ON public.officer_rubric_scores;
DROP POLICY IF EXISTS "rubric_scores_all" ON public.officer_rubric_scores;

CREATE POLICY "rubric_scores_all" ON public.officer_rubric_scores
  FOR ALL TO authenticated USING (
    officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.applicants a
      WHERE a.id = officer_rubric_scores.applicant_id
      AND (
        EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = a.club_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = a.club_id AND user_id = auth.uid())
      )
    )
  ) WITH CHECK (officer_id = auth.uid());

-- ── recruitment_requirements ─────────────────────────────────────────
DROP POLICY IF EXISTS "Club owners can manage requirements" ON public.recruitment_requirements;
DROP POLICY IF EXISTS "recruitment_requirements_read" ON public.recruitment_requirements;
DROP POLICY IF EXISTS "recruitment_requirements_write" ON public.recruitment_requirements;

CREATE POLICY "recruitment_requirements_read" ON public.recruitment_requirements
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_requirements.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_requirements.club_id AND user_id = auth.uid())
  );

CREATE POLICY "recruitment_requirements_write" ON public.recruitment_requirements
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_requirements.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_requirements.club_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = recruitment_requirements.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = recruitment_requirements.club_id AND user_id = auth.uid())
  );

-- ── application_forms ────────────────────────────────────────────────
DROP POLICY IF EXISTS "application_forms_read" ON public.application_forms;
DROP POLICY IF EXISTS "application_forms_write" ON public.application_forms;

CREATE POLICY "application_forms_read" ON public.application_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "application_forms_write" ON public.application_forms
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = application_forms.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = application_forms.club_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.club_owners WHERE club_id = application_forms.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_officers WHERE club_id = application_forms.club_id AND user_id = auth.uid())
  );
