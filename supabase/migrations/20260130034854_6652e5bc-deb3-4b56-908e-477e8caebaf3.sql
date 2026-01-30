-- Remove the overly permissive public SELECT policy that exposes email addresses
DROP POLICY IF EXISTS "Anyone can view club owners" ON public.club_owners;

-- The existing "Users can view their own ownership" policy will remain
-- This ensures users can only see their own club ownership records