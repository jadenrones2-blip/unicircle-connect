-- Create table for club memberships (clubs the student has joined)
CREATE TABLE public.club_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'member' CHECK (status IN ('member', 'officer', 'alumni')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for club applications
CREATE TABLE public.club_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_club_memberships_user_id ON public.club_memberships(user_id);
CREATE INDEX idx_club_applications_user_id ON public.club_applications(user_id);
CREATE UNIQUE INDEX idx_club_applications_unique ON public.club_applications(user_id, club_id) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for club_memberships
CREATE POLICY "Users can view their own memberships" 
ON public.club_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships" 
ON public.club_memberships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memberships" 
ON public.club_memberships 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for club_applications
CREATE POLICY "Users can view their own applications" 
ON public.club_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications" 
ON public.club_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" 
ON public.club_applications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications" 
ON public.club_applications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on applications
CREATE TRIGGER update_club_applications_updated_at
BEFORE UPDATE ON public.club_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();