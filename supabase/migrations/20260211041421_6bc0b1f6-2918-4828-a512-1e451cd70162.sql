-- Drop and recreate the student INSERT policy with tighter constraints
DROP POLICY IF EXISTS "Students can insert their own applicant records" ON public.applicants;

CREATE POLICY "Students can insert their own applicant records"
ON public.applicants
FOR INSERT
TO authenticated
WITH CHECK (
  email = get_user_email()
  AND fit_score IS NULL
  AND gpa IS NULL
  AND ai_summary IS NULL
  AND passes_strict_filters IS NULL
  AND notes IS NULL
);

-- Drop and recreate the student SELECT policy with explicit role
DROP POLICY IF EXISTS "Students can view their own applicant records" ON public.applicants;

CREATE POLICY "Students can view their own applicant records"
ON public.applicants
FOR SELECT
TO authenticated
USING (email = get_user_email());