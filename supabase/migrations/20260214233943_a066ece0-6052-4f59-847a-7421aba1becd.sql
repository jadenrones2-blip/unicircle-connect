
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read domain rules" ON public.email_domain_rules;

-- Add authenticated-only read policy
CREATE POLICY "Authenticated users can read domain rules"
ON public.email_domain_rules
FOR SELECT
USING (auth.role() = 'authenticated');
