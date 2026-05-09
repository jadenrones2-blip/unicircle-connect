-- Club enrichments table — MAIN DB (xvaoxmqmnmhbnpwobpmm)
-- Stores AI-generated profile data + Instagram photos scraped per club
-- Run in: supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm

CREATE TABLE IF NOT EXISTS club_enrichments (
  club_id text PRIMARY KEY,
  one_liner text,
  what_they_do text,
  who_should_join text,
  vibe text,
  time_commitment text, -- 'Light' | 'Medium' | 'Heavy'
  highlights text[],
  tags text[],
  instagram_photo_url text,
  enriched_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE club_enrichments ENABLE ROW LEVEL SECURITY;

-- Anyone can read enrichments (needed for public club directory)
CREATE POLICY "Public read enrichments"
  ON club_enrichments FOR SELECT USING (true);

-- Only service role can write (edge function uses service role key)
CREATE POLICY "Service role write enrichments"
  ON club_enrichments FOR ALL USING (auth.role() = 'service_role');