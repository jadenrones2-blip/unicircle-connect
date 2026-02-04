-- Recruitment Settings table (one per club)
CREATE TABLE public.recruitment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment_settings ENABLE ROW LEVEL SECURITY;

-- Recruitment Stages table
CREATE TABLE public.recruitment_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL,
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment_stages ENABLE ROW LEVEL SECURITY;

-- Applicants table
CREATE TABLE public.applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL,
  stage_id UUID REFERENCES public.recruitment_stages(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  major TEXT,
  year TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX idx_applicants_club_id ON public.applicants(club_id);
CREATE INDEX idx_applicants_stage_id ON public.applicants(stage_id);
CREATE INDEX idx_recruitment_stages_club_id ON public.recruitment_stages(club_id);

-- RLS Policies for recruitment_settings (only club owners can manage)
CREATE POLICY "Club owners can view their recruitment settings"
ON public.recruitment_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_settings.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can insert their recruitment settings"
ON public.recruitment_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_settings.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can update their recruitment settings"
ON public.recruitment_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_settings.club_id
    AND club_owners.user_id = auth.uid()
  )
);

-- RLS Policies for recruitment_stages
CREATE POLICY "Club owners can view their recruitment stages"
ON public.recruitment_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_stages.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can insert recruitment stages"
ON public.recruitment_stages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_stages.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can update their recruitment stages"
ON public.recruitment_stages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_stages.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can delete their recruitment stages"
ON public.recruitment_stages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = recruitment_stages.club_id
    AND club_owners.user_id = auth.uid()
  )
);

-- RLS Policies for applicants
CREATE POLICY "Club owners can view their applicants"
ON public.applicants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = applicants.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can insert applicants"
ON public.applicants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = applicants.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can update their applicants"
ON public.applicants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = applicants.club_id
    AND club_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can delete their applicants"
ON public.applicants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.club_owners
    WHERE club_owners.club_id = applicants.club_id
    AND club_owners.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_recruitment_settings_updated_at
BEFORE UPDATE ON public.recruitment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_stages_updated_at
BEFORE UPDATE ON public.recruitment_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applicants_updated_at
BEFORE UPDATE ON public.applicants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();