-- Add assigned_to column for Jira-style scoring assignment
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS applicants_assigned_to_idx ON public.applicants(assigned_to);
