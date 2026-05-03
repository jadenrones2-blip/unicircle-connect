-- Fix: Enable RLS on raw_club_pages in external clubs DB (tayhvgmterjzolvodwow)
-- Run this in: supabase.com/dashboard/project/tayhvgmterjzolvodwow/editor

ALTER TABLE raw_club_pages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read club page data (needed for public club discovery)
CREATE POLICY "Public read access"
  ON raw_club_pages
  FOR SELECT
  USING (true);

-- Block all writes via API (data is loaded via ETL/scripts, not user-facing mutations)
-- INSERT, UPDATE, DELETE have no policy → denied by default when RLS is enabled
