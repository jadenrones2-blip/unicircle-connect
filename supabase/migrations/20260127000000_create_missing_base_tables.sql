-- Migration: Create tables and enums that existed on remote Supabase but were
-- never captured in a local migration file. These are required by later
-- migrations (e.g. 20260130034854 references club_owners).

-- ============================================================
-- 1. Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.event_source_type AS ENUM ('ucsd_calendar', 'eventbrite_organizer', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_status AS ENUM ('idle', 'syncing', 'success', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Tables
-- ============================================================

-- club_owners: tracks which users own which clubs
CREATE TABLE IF NOT EXISTS public.club_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  email TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_id)
);

ALTER TABLE public.club_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ownership"
  ON public.club_owners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ownership"
  ON public.club_owners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view club owners"
  ON public.club_owners FOR SELECT
  USING (true);

-- user_roles: RBAC for admin/moderator access
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- event_sources: configured event feed sources
CREATE TABLE IF NOT EXISTS public.event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type public.event_source_type NOT NULL,
  source_url TEXT NOT NULL,
  label TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_status public.sync_status NOT NULL DEFAULT 'idle',
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  events_synced INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Functions
-- ============================================================

-- has_role: check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
      AND user_roles.role = _role
  );
$$;

-- get_user_email: return the current user's email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;
