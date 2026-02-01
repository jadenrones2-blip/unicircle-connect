-- Add DELETE policy for profiles table to allow GDPR/CCPA compliance
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);