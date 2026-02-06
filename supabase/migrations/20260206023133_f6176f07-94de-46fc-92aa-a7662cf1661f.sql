-- Create table for new club requests
CREATE TABLE public.new_club_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  club_name TEXT NOT NULL,
  club_description TEXT,
  club_category TEXT,
  proof_link TEXT NOT NULL,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.new_club_requests ENABLE ROW LEVEL SECURITY;

-- Only allow .edu email users to submit requests
CREATE POLICY "Only edu email users can submit new club requests"
ON public.new_club_requests
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND user_email = public.get_user_email()
  AND user_email LIKE '%.edu'
);

-- Users can view their own requests
CREATE POLICY "Users can view their own club requests"
ON public.new_club_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot update or delete their requests (admin only)
-- No UPDATE or DELETE policies for regular users

-- Add trigger for updated_at
CREATE TRIGGER update_new_club_requests_updated_at
BEFORE UPDATE ON public.new_club_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();