-- Add recruitment_requirements table for strict filters and AI criteria
CREATE TABLE public.recruitment_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('strict', 'ai')),
  criterion TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add metadata and AI screening columns to applicants table
ALTER TABLE public.applicants
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS fit_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gpa NUMERIC(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS passes_strict_filters BOOLEAN DEFAULT NULL;

-- Enable RLS on recruitment_requirements
ALTER TABLE public.recruitment_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruitment_requirements
CREATE POLICY "Club owners can view their requirements"
ON public.recruitment_requirements
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM club_owners
  WHERE club_owners.club_id = recruitment_requirements.club_id
  AND club_owners.user_id = auth.uid()
));

CREATE POLICY "Club owners can insert requirements"
ON public.recruitment_requirements
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM club_owners
  WHERE club_owners.club_id = recruitment_requirements.club_id
  AND club_owners.user_id = auth.uid()
));

CREATE POLICY "Club owners can update their requirements"
ON public.recruitment_requirements
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM club_owners
  WHERE club_owners.club_id = recruitment_requirements.club_id
  AND club_owners.user_id = auth.uid()
));

CREATE POLICY "Club owners can delete their requirements"
ON public.recruitment_requirements
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM club_owners
  WHERE club_owners.club_id = recruitment_requirements.club_id
  AND club_owners.user_id = auth.uid()
));

-- Trigger for updated_at on recruitment_requirements
CREATE TRIGGER update_recruitment_requirements_updated_at
BEFORE UPDATE ON public.recruitment_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();