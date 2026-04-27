-- Survey responses table — for club-hosted surveys independent of recruitment
-- Run manually in: https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm/sql/new

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     text NOT NULL,
  responses   jsonb DEFAULT '{}',
  email       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public survey — no auth required)
CREATE POLICY "Anyone can submit survey"
  ON public.survey_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can read (club officers viewing responses)
CREATE POLICY "Authenticated users can read surveys"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (true);
