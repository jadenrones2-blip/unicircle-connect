
-- Create saved_clubs table for user bookmarks
CREATE TABLE public.saved_clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one save per user per club
ALTER TABLE public.saved_clubs ADD CONSTRAINT saved_clubs_user_club_unique UNIQUE (user_id, club_id);

-- Enable RLS
ALTER TABLE public.saved_clubs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved clubs
CREATE POLICY "Users can view their own saved clubs"
ON public.saved_clubs FOR SELECT
USING (auth.uid() = user_id);

-- Users can save clubs
CREATE POLICY "Users can save clubs"
ON public.saved_clubs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave clubs
CREATE POLICY "Users can unsave clubs"
ON public.saved_clubs FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_saved_clubs_user_id ON public.saved_clubs (user_id);
