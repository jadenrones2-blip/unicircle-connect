-- ============================================================
-- RLS Security Patches
-- Run on the LOVABLE / AUTH DB (gojqmerruiimkbbiajwf)
-- ============================================================

-- ── 1. Tighten application_forms write policy ────────────────
-- Only club owners may write their own club's form (was: any logged-in user)
DROP POLICY IF EXISTS "application_forms_write" ON public.application_forms;
CREATE POLICY "application_forms_write" ON public.application_forms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE club_owners.club_id = application_forms.club_id
        AND club_owners.user_id = auth.uid()
    )
  );

-- ── 2. Tighten deliberation_votes policies ───────────────────
-- Reads: only club owners may see votes on their club's applicants
DROP POLICY IF EXISTS "deliberation_votes_read" ON public.deliberation_votes;
CREATE POLICY "deliberation_votes_read" ON public.deliberation_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applicants a
      JOIN public.club_owners co ON co.club_id = a.club_id
      WHERE a.id = deliberation_votes.applicant_id
        AND co.user_id = auth.uid()
    )
  );

-- Writes: voters may only write their own vote, and only for clubs they own
DROP POLICY IF EXISTS "deliberation_votes_write" ON public.deliberation_votes;
CREATE POLICY "deliberation_votes_write" ON public.deliberation_votes
  FOR ALL USING (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.applicants a
      JOIN public.club_owners co ON co.club_id = a.club_id
      WHERE a.id = deliberation_votes.applicant_id
        AND co.user_id = auth.uid()
    )
  );

-- ── 3. RLS on new_club_requests ──────────────────────────────
-- Anyone (incl. anon) can submit a new request
-- Only admins can read, update, or delete requests
ALTER TABLE public.new_club_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "new_club_requests_insert" ON public.new_club_requests;
CREATE POLICY "new_club_requests_insert" ON public.new_club_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "new_club_requests_select_admin" ON public.new_club_requests;
CREATE POLICY "new_club_requests_select_admin" ON public.new_club_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "new_club_requests_update_admin" ON public.new_club_requests;
CREATE POLICY "new_club_requests_update_admin" ON public.new_club_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- ── 4. Unique constraint on new_club_requests ────────────────
-- Prevent duplicate pending submissions for the same email + club name
CREATE UNIQUE INDEX IF NOT EXISTS idx_new_club_requests_pending_unique
  ON public.new_club_requests (user_email, club_name)
  WHERE status = 'pending';
