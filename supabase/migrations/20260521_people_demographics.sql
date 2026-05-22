-- Add demographics columns to people table
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('applicant', 'member', 'alumni')),
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'non-binary', 'unspecified')),
  ADD COLUMN IF NOT EXISTS grad_year integer;

-- Unique constraint needed for upsert-on-conflict in ingest-roster
CREATE UNIQUE INDEX IF NOT EXISTS people_email_org_unique
  ON people(email, organization_id)
  WHERE email IS NOT NULL;
