-- Application forms: stores the officer-designed question schema per club
CREATE TABLE IF NOT EXISTS public.application_forms (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     text NOT NULL UNIQUE,
  questions   jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.application_forms ENABLE ROW LEVEL SECURITY;

-- Anyone can read a club's form (needed for student apply page)
CREATE POLICY IF NOT EXISTS "application_forms_read" ON public.application_forms
  FOR SELECT USING (true);

-- Only authenticated users who own the club can write
CREATE POLICY IF NOT EXISTS "application_forms_write" ON public.application_forms
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Deliberation votes: per-officer vote on each applicant
CREATE TABLE IF NOT EXISTS public.deliberation_votes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  voter_id     uuid NOT NULL,
  vote         text CHECK (vote IN ('yes', 'no', 'maybe')),
  comment      text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (applicant_id, voter_id)
);

ALTER TABLE public.deliberation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "deliberation_votes_read" ON public.deliberation_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "deliberation_votes_write" ON public.deliberation_votes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Add final decision field to applicants if not already there
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS final_decision text
    CHECK (final_decision IN ('pending', 'accepted', 'waitlisted', 'rejected'))
    DEFAULT 'pending';
