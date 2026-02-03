-- Create admin_profiles table for club owner personal info
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  role_title text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own admin profile"
ON public.admin_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own admin profile"
ON public.admin_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own admin profile"
ON public.admin_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own admin profile"
ON public.admin_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_admin_profiles_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();