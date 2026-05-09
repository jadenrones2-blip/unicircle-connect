-- Event food flags — MAIN DB (xvaoxmqmnmhbnpwobpmm)
-- Claude-classified food mentions in event captions
-- Run in: supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm

CREATE TABLE IF NOT EXISTS event_food_flags (
  event_id text PRIMARY KEY,
  has_food boolean NOT NULL DEFAULT false,
  confidence text, -- 'high' | 'medium' | 'low'
  food_mention text, -- what Claude found, e.g. "free pizza" or "boba provided"
  flagged_at timestamptz DEFAULT now()
);

ALTER TABLE event_food_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read food flags"
  ON event_food_flags FOR SELECT USING (true);

CREATE POLICY "Service role write food flags"
  ON event_food_flags FOR ALL USING (auth.role() = 'service_role');
