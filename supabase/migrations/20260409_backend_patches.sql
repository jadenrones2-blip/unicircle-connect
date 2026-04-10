-- ================================================================
-- Backend patches — run in Supabase dashboard SQL editor
-- Main project: xvaoxmqmnmhbnpwobpmm
-- ================================================================

-- ── 1. is_intake column on recruitment_stages ────────────────────
-- createStages() inserts {is_intake: true} for the first stage.
-- Without this column the insert errors.
ALTER TABLE public.recruitment_stages
  ADD COLUMN IF NOT EXISTS is_intake boolean NOT NULL DEFAULT false;

-- Mark any existing first stage (order_index = 0) as intake
UPDATE public.recruitment_stages rs
SET is_intake = true
WHERE order_index = (
  SELECT MIN(order_index)
  FROM public.recruitment_stages rs2
  WHERE rs2.club_id = rs.club_id
);

-- ── 2. people table (used by OrgPeopleDashboard) ─────────────────
-- If this table was created manually in the dashboard it already
-- exists — the IF NOT EXISTS guard makes this safe to re-run.
CREATE TABLE IF NOT EXISTS public.people (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id text NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL DEFAULT '',
  email           text,
  major           text,
  year            text,
  stage           text NOT NULL DEFAULT 'applied'
                    CHECK (stage IN ('member','applied','under_review','interview','accepted','rejected')),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS people_organization_id_idx ON public.people(organization_id);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read people in their clubs
DROP POLICY IF EXISTS "people_select" ON public.people;
CREATE POLICY "people_select" ON public.people
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert/update/delete people
DROP POLICY IF EXISTS "people_write" ON public.people;
CREATE POLICY "people_write" ON public.people
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- ── 3. Realtime publication for applicants ───────────────────────
-- Required for the live kanban subscription in useRecruitment.ts.
-- ALTER PUBLICATION is idempotent-safe (no error if already added).
ALTER PUBLICATION supabase_realtime ADD TABLE public.applicants;

-- ── 4. Fix deliberation_votes RLS to allow officers ──────────────
-- The 20260324_rls_patches tightened votes to owner-only.
-- Officers invited via club_officers also need to vote.

DROP POLICY IF EXISTS "deliberation_votes_read" ON public.deliberation_votes;
CREATE POLICY "deliberation_votes_read" ON public.deliberation_votes
  FOR SELECT TO authenticated
  USING (
    -- Club owner
    EXISTS (
      SELECT 1 FROM public.applicants a
      JOIN public.club_owners co ON co.club_id = a.club_id
      WHERE a.id = deliberation_votes.applicant_id
        AND co.user_id = auth.uid()
    )
    OR
    -- Invited officer
    EXISTS (
      SELECT 1 FROM public.applicants a
      JOIN public.club_officers cf ON cf.club_id = a.club_id
      WHERE a.id = deliberation_votes.applicant_id
        AND cf.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "deliberation_votes_write" ON public.deliberation_votes;
CREATE POLICY "deliberation_votes_write" ON public.deliberation_votes
  FOR ALL TO authenticated
  USING (
    voter_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.applicants a
        JOIN public.club_owners co ON co.club_id = a.club_id
        WHERE a.id = deliberation_votes.applicant_id
          AND co.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.applicants a
        JOIN public.club_officers cf ON cf.club_id = a.club_id
        WHERE a.id = deliberation_votes.applicant_id
          AND cf.user_id = auth.uid()
      )
    )
  );

-- ── 5. Allow officers to read applicants ─────────────────────────
-- Officers need to read applicants to use the kanban and drawer.
-- Add a policy that allows club_officers members to select applicants.
DROP POLICY IF EXISTS "officers_can_read_applicants" ON public.applicants;
CREATE POLICY "officers_can_read_applicants" ON public.applicants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_officers cf
      WHERE cf.club_id = applicants.club_id
        AND cf.user_id = auth.uid()
    )
  );

-- ── 6. Storage buckets: resumes, application-videos, avatars ─────
-- These are created manually in the dashboard but migrations make
-- them reproducible. ON CONFLICT guard makes this safe to re-run.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('resumes', 'resumes', false, 10485760,
   ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('application-videos', 'application-videos', false, 104857600,
   ARRAY['video/mp4','video/quicktime','video/webm']),
  ('avatars', 'avatars', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Resumes: only uploader can read their own; authenticated can upload
DROP POLICY IF EXISTS "resumes_insert" ON storage.objects;
CREATE POLICY "resumes_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_select" ON storage.objects;
CREATE POLICY "resumes_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'resumes');

-- Application videos: same pattern
DROP POLICY IF EXISTS "videos_insert" ON storage.objects;
CREATE POLICY "videos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'application-videos');

DROP POLICY IF EXISTS "videos_select" ON storage.objects;
CREATE POLICY "videos_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'application-videos');

-- Avatars: public read, authenticated write
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');
