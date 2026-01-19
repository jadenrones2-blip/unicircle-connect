-- Create table for club claim requests
CREATE TABLE public.club_claim_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  proof_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.club_claim_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a claim request (no auth required)
CREATE POLICY "Anyone can submit claim requests"
ON public.club_claim_requests
FOR INSERT
WITH CHECK (true);

-- Users cannot read/update/delete claim requests (admin only via dashboard)
CREATE POLICY "No public read access"
ON public.club_claim_requests
FOR SELECT
USING (false);

CREATE POLICY "No public update access"
ON public.club_claim_requests
FOR UPDATE
USING (false);

CREATE POLICY "No public delete access"
ON public.club_claim_requests
FOR DELETE
USING (false);