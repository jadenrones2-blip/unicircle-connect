-- Club Spotlights: short-form multi-slide cards clubs post to engage students
CREATE TABLE IF NOT EXISTS public.club_spotlights (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     text NOT NULL,
  club_name   text,
  slides      jsonb NOT NULL DEFAULT '[]',
  -- Each slide: { emoji: string, title: string, body: string }
  active      boolean DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_spotlights_club_id_idx ON public.club_spotlights(club_id);
CREATE INDEX IF NOT EXISTS club_spotlights_active_idx  ON public.club_spotlights(active);

-- RLS
ALTER TABLE public.club_spotlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active spotlights"
  ON public.club_spotlights FOR SELECT
  USING (active = true);

CREATE POLICY "Club owners can manage spotlights"
  ON public.club_spotlights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE club_owners.user_id = auth.uid()
        AND club_owners.club_id = club_spotlights.club_id
    )
  );
