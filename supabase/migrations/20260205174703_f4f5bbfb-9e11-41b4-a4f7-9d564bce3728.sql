-- Add visibility controls to recruitment_settings for club-controlled student visibility
ALTER TABLE public.recruitment_settings
ADD COLUMN IF NOT EXISTS show_stage_names boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_progress_bar boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_timeline boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS student_visible_message text DEFAULT NULL;

-- Allow students to view their own applicant records (matched by email)
-- First, we need to get the user's email from auth.users
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Add policy for students to view their own applications
CREATE POLICY "Students can view their own applicant records"
ON public.applicants
FOR SELECT
USING (
  email = public.get_user_email()
);

-- Allow students to view recruitment stages for clubs they've applied to
CREATE POLICY "Students can view stages for clubs they applied to"
ON public.recruitment_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applicants
    WHERE applicants.club_id = recruitment_stages.club_id
    AND applicants.email = public.get_user_email()
  )
);

-- Allow students to view recruitment settings for clubs they've applied to
CREATE POLICY "Students can view settings for clubs they applied to"
ON public.recruitment_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applicants
    WHERE applicants.club_id = recruitment_settings.club_id
    AND applicants.email = public.get_user_email()
  )
);