-- Drop existing SELECT policy and recreate with correct restriction
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create correct SELECT policy ensuring users can ONLY view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);