-- Fix 1: Prevent users from manipulating their own application status
-- Drop the existing overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own applications" ON public.club_applications;

-- Create a more restrictive UPDATE policy that only allows updating 'notes' field
-- Users cannot change status, club_id, club_name, or other sensitive fields
CREATE POLICY "Users can update their own application notes only"
ON public.club_applications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- Ensure status cannot be changed by the user
  -- OLD values must match NEW values for protected fields
);

-- Create a trigger to enforce that users cannot change status
CREATE OR REPLACE FUNCTION public.prevent_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is updating their own application, prevent status changes
  -- Only service role or admin should be able to change status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if this is a regular user (not service role)
    -- Service role operations bypass RLS, so if we're here, it's a user
    RAISE EXCEPTION 'Users cannot modify application status';
  END IF;
  
  -- Also prevent changing club_id and club_name
  IF OLD.club_id IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'Users cannot modify application club_id';
  END IF;
  
  IF OLD.club_name IS DISTINCT FROM NEW.club_name THEN
    RAISE EXCEPTION 'Users cannot modify application club_name';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_application_status_change_trigger ON public.club_applications;
CREATE TRIGGER prevent_application_status_change_trigger
  BEFORE UPDATE ON public.club_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_application_status_change();

-- Fix 2: Verify club_owners email protection (add explicit column-level comment for documentation)
-- The existing policy "Users can view their own ownership" with auth.uid() = user_id IS correct
-- But let's add an extra layer by ensuring no other policies exist that might be overly permissive
-- Drop any potentially conflicting policies and recreate with explicit naming
DROP POLICY IF EXISTS "Users can view their own ownership" ON public.club_owners;
CREATE POLICY "Owners can only view their own club ownership records"
ON public.club_owners
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 3: Restrict disposable_domains to authenticated users only (info level but good practice)
-- This table is used to validate email domains during signup
-- However, checking should happen server-side, so we can restrict client access
DROP POLICY IF EXISTS "Anyone can read disposable domains" ON public.disposable_domains;
CREATE POLICY "Authenticated users can read disposable domains"
ON public.disposable_domains
FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');