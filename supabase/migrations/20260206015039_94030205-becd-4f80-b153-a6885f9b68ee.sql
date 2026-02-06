-- Allow students to apply (insert themselves as applicants)
-- They can only insert records where the email matches their own authenticated email
CREATE POLICY "Students can insert their own applicant records"
ON public.applicants
FOR INSERT
WITH CHECK (email = public.get_user_email());