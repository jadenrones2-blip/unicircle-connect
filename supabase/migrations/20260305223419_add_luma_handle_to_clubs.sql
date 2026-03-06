-- Add luma_handle column to clubs in the external database
-- This stores the lu.ma/<handle> slug for each club so the scraper
-- can fetch events directly from Luma's calendar API without needing
-- Firecrawl or AI extraction.

-- Note: This migration runs against the INTERNAL Supabase project.
-- The external clubs table is in a separate project; apply manually via:
--   ALTER TABLE clubs ADD COLUMN IF NOT EXISTS luma_handle TEXT;
--   CREATE INDEX IF NOT EXISTS idx_clubs_luma_handle ON clubs(luma_handle) WHERE luma_handle IS NOT NULL;

-- This file documents the schema change for the external DB.
-- No-op for the internal project (which only has a waitlist table).
SELECT 1;
