-- SCRUM-31: bio-based club matching
-- Adds a jsonb column to store keywords extracted from a student's bio by the
-- parse-bio edge function. Mirrors profiles.resume_signals.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_signals jsonb DEFAULT '[]';
