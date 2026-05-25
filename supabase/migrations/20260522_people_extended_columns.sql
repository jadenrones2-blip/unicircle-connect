-- Add columns the AI ingest-roster + NIGO save flow needs.
-- Run this in the Supabase dashboard SQL editor:
--   https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm/sql

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS gender    text,
  ADD COLUMN IF NOT EXISTS status    text,
  ADD COLUMN IF NOT EXISTS grad_year integer;

-- Soft constraints (use named DO blocks so they're idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'people_gender_check'
  ) THEN
    ALTER TABLE public.people
      ADD CONSTRAINT people_gender_check
      CHECK (gender IS NULL OR gender IN ('male','female','non-binary','unspecified'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'people_status_check'
  ) THEN
    ALTER TABLE public.people
      ADD CONSTRAINT people_status_check
      CHECK (status IS NULL OR status IN ('applicant','member','alumni'));
  END IF;
END $$;

-- Unique email per org so onConflict 'email,organization_id' works
CREATE UNIQUE INDEX IF NOT EXISTS people_email_org_unique_idx
  ON public.people(organization_id, lower(email))
  WHERE email IS NOT NULL;

-- Force PostgREST to refresh its schema cache so the new columns are visible
NOTIFY pgrst, 'reload schema';
