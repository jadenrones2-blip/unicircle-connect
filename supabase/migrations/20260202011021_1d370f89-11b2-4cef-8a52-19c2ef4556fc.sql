-- Phase 1: Club Verification Security System

-- 1. Create enums for verification states and trust levels
CREATE TYPE public.verification_state AS ENUM ('unverified', 'provisional', 'verified', 'suspended');
CREATE TYPE public.trust_level AS ENUM ('high', 'medium', 'low');

-- 2. Extend club_owners table with verification fields
ALTER TABLE public.club_owners 
  ADD COLUMN IF NOT EXISTS verification_state public.verification_state DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS trust_level public.trust_level DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_domain TEXT,
  ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisional_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restrictions JSONB DEFAULT '{"can_publish_events": false, "can_mass_message": false, "can_add_links": false}'::jsonb;

-- 3. Rate limiting table for claim attempts
CREATE TABLE public.claim_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  club_id TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, club_id)
);

-- Enable RLS
ALTER TABLE public.claim_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can access rate limits
CREATE POLICY "No public access to rate limits"
  ON public.claim_rate_limits FOR ALL
  USING (false);

-- 4. Email domain rules (allowlist/blocklist/flag)
CREATE TABLE public.email_domain_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('allow', 'block', 'flag')),
  trust_level public.trust_level,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_domain_rules ENABLE ROW LEVEL SECURITY;

-- Public read for domain validation, no write
CREATE POLICY "Anyone can read domain rules"
  ON public.email_domain_rules FOR SELECT
  USING (true);

CREATE POLICY "No public write to domain rules"
  ON public.email_domain_rules FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No public update to domain rules"
  ON public.email_domain_rules FOR UPDATE
  USING (false);

CREATE POLICY "No public delete from domain rules"
  ON public.email_domain_rules FOR DELETE
  USING (false);

-- 5. Disposable email domains blocklist
CREATE TABLE public.disposable_domains (
  domain TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disposable_domains ENABLE ROW LEVEL SECURITY;

-- Public read for validation
CREATE POLICY "Anyone can read disposable domains"
  ON public.disposable_domains FOR SELECT
  USING (true);

CREATE POLICY "No public write to disposable domains"
  ON public.disposable_domains FOR INSERT
  WITH CHECK (false);

-- 6. Admin audit log for all admin actions
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT NOT NULL,
  actor_user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Club owners can view their own club's audit log
CREATE POLICY "Owners can view their club audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owners 
      WHERE club_owners.club_id = admin_audit_log.club_id 
      AND club_owners.user_id = auth.uid()
    )
  );

-- No direct public writes (edge function uses service role)
CREATE POLICY "No public write to audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (false);

-- 7. Ownership transfer requests
CREATE TABLE public.ownership_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT NOT NULL,
  from_user_id UUID,
  to_user_id UUID NOT NULL,
  to_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approvals JSONB DEFAULT '[]'::jsonb,
  required_approvals INTEGER DEFAULT 2,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;

-- Owners can view and create transfers for their clubs
CREATE POLICY "Owners can view their club transfers"
  ON public.ownership_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owners 
      WHERE club_owners.club_id = ownership_transfers.club_id 
      AND club_owners.user_id = auth.uid()
    )
    OR to_user_id = auth.uid()
    OR from_user_id = auth.uid()
  );

CREATE POLICY "Owners can initiate transfers"
  ON public.ownership_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_owners 
      WHERE club_owners.club_id = ownership_transfers.club_id 
      AND club_owners.user_id = auth.uid()
    )
  );

-- 8. Seed common disposable email domains
INSERT INTO public.disposable_domains (domain) VALUES
  ('tempmail.com'),
  ('throwaway.email'),
  ('guerrillamail.com'),
  ('10minutemail.com'),
  ('mailinator.com'),
  ('temp-mail.org'),
  ('fakeinbox.com'),
  ('trashmail.com'),
  ('getnada.com'),
  ('mohmal.com'),
  ('tempail.com'),
  ('dispostable.com'),
  ('maildrop.cc'),
  ('yopmail.com'),
  ('sharklasers.com'),
  ('grr.la'),
  ('spam4.me'),
  ('emailondeck.com'),
  ('mintemail.com'),
  ('tempr.email')
ON CONFLICT (domain) DO NOTHING;

-- 9. Seed trusted university domains as allow rules
INSERT INTO public.email_domain_rules (domain, rule_type, trust_level, reason) VALUES
  ('ucsd.edu', 'allow', 'high', 'UC San Diego - primary university domain'),
  ('ucsc.edu', 'allow', 'high', 'UC Santa Cruz'),
  ('ucla.edu', 'allow', 'high', 'UC Los Angeles'),
  ('ucsb.edu', 'allow', 'high', 'UC Santa Barbara'),
  ('uci.edu', 'allow', 'high', 'UC Irvine'),
  ('ucr.edu', 'allow', 'high', 'UC Riverside'),
  ('ucmerced.edu', 'allow', 'high', 'UC Merced'),
  ('ucdavis.edu', 'allow', 'high', 'UC Davis'),
  ('berkeley.edu', 'allow', 'high', 'UC Berkeley'),
  ('ucsf.edu', 'allow', 'high', 'UC San Francisco'),
  ('stanford.edu', 'allow', 'high', 'Stanford University'),
  ('mit.edu', 'allow', 'high', 'MIT'),
  ('harvard.edu', 'allow', 'high', 'Harvard University')
ON CONFLICT (domain) DO NOTHING;

-- 10. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_claim_rate_limits_email_club ON public.claim_rate_limits(email, club_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_club ON public.admin_audit_log(club_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_club ON public.ownership_transfers(club_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status ON public.ownership_transfers(status);
CREATE INDEX IF NOT EXISTS idx_club_owners_verification ON public.club_owners(verification_state);