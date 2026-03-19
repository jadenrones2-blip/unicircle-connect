-- ================================================================
-- Feature migrations: RSVP, Reviews, Opportunities, Notifications
-- Run on the external DB (tayhvgmterjzolvodwow)
-- Note: user_id is a plain uuid (no FK to auth.users — cross-project)
-- Security is enforced at the application layer
-- ================================================================

-- ── Event RSVPs ──────────────────────────────────────────────────
create table if not exists public.event_rsvps (
  id          uuid default gen_random_uuid() primary key,
  event_id    text not null,
  user_id     uuid not null,
  status      text default 'going' check (status in ('going', 'interested')),
  created_at  timestamp with time zone default now(),
  unique (event_id, user_id)
);

-- ── Club Reviews ─────────────────────────────────────────────────
create table if not exists public.club_reviews (
  id          uuid default gen_random_uuid() primary key,
  club_id     text not null,
  user_id     uuid not null,
  rating      int not null check (rating between 1 and 5),
  body        text,
  created_at  timestamp with time zone default now(),
  unique (club_id, user_id)
);

-- ── Opportunities ────────────────────────────────────────────────
create table if not exists public.opportunities (
  id          uuid default gen_random_uuid() primary key,
  club_id     text not null,
  club_name   text,
  title       text not null,
  description text,
  type        text default 'position' check (type in ('position', 'internship', 'research', 'volunteer', 'other')),
  deadline    date,
  link        text,
  active      boolean default true,
  created_at  timestamp with time zone default now()
);

-- ── Notifications ────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null,
  type        text not null,
  title       text not null,
  body        text,
  read        boolean default false,
  metadata    jsonb,
  created_at  timestamp with time zone default now()
);

-- ── Event Co-hosts ───────────────────────────────────────────────
create table if not exists public.event_cohosts (
  id           uuid default gen_random_uuid() primary key,
  event_id     text not null,
  club_id      text not null,
  club_name    text,
  created_at   timestamp with time zone default now(),
  unique (event_id, club_id)
);
