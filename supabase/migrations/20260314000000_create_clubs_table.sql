-- Create local clubs table so the app can load clubs without the external DB proxy

CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  category_bucket TEXT,
  description TEXT,
  email TEXT,
  instagram TEXT,
  website TEXT,
  image_url TEXT,
  recruiting_status TEXT DEFAULT 'closed',
  meeting_schedule TEXT DEFAULT 'TBD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Anyone can read clubs
CREATE POLICY "Public read access for clubs"
  ON public.clubs FOR SELECT
  USING (true);

-- Only authenticated users can insert (for club owners / admins)
CREATE POLICY "Authenticated users can insert clubs"
  ON public.clubs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Club owners can update their clubs
CREATE POLICY "Authenticated users can update clubs"
  ON public.clubs FOR UPDATE
  USING (auth.uid() IS NOT NULL);
