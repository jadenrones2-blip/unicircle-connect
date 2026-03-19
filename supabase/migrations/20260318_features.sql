-- ================================================================
-- Feature migrations: RSVP, Reviews, Opportunities, Notifications
-- Run this in the Supabase SQL editor (Lovable project)
-- ================================================================

-- ── Event RSVPs ──────────────────────────────────────────────────
create table if not exists public.event_rsvps (
  id          uuid default gen_random_uuid() primary key,
  event_id    text not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  status      text default 'going' check (status in ('going', 'interested')),
  created_at  timestamp with time zone default now(),
  unique (event_id, user_id)
);

alter table public.event_rsvps enable row level security;

create policy "Users can manage their own RSVPs"
  on public.event_rsvps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read RSVP counts"
  on public.event_rsvps for select
  using (true);

-- ── Club Reviews ─────────────────────────────────────────────────
create table if not exists public.club_reviews (
  id          uuid default gen_random_uuid() primary key,
  club_id     text not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  rating      int not null check (rating between 1 and 5),
  body        text,
  created_at  timestamp with time zone default now(),
  unique (club_id, user_id)
);

alter table public.club_reviews enable row level security;

create policy "Users can manage their own reviews"
  on public.club_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read reviews"
  on public.club_reviews for select
  using (true);

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

alter table public.opportunities enable row level security;

create policy "Anyone can read active opportunities"
  on public.opportunities for select
  using (active = true);

create policy "Club admins can manage opportunities"
  on public.opportunities for all
  using (
    exists (
      select 1 from public.club_ownership
      where club_id = opportunities.club_id
        and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.club_ownership
      where club_id = opportunities.club_id
        and user_id = auth.uid()
    )
  );

-- ── Event Co-hosts ───────────────────────────────────────────────
-- Links a dataClient event (by its ID) to additional co-hosting clubs
create table if not exists public.event_cohosts (
  id           uuid default gen_random_uuid() primary key,
  event_id     text not null,          -- ID from the dataClient events table
  club_id      text not null,          -- co-hosting club ID
  club_name    text,
  created_at   timestamp with time zone default now(),
  unique (event_id, club_id)
);

alter table public.event_cohosts enable row level security;

create policy "Anyone can read co-hosts"
  on public.event_cohosts for select
  using (true);

create policy "Club admins can manage co-hosts"
  on public.event_cohosts for all
  using (
    exists (
      select 1 from public.club_ownership
      where user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.club_ownership
      where user_id = auth.uid()
    )
  );

-- ── Notifications ────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text not null,
  title       text not null,
  body        text,
  read        boolean default false,
  metadata    jsonb,
  created_at  timestamp with time zone default now()
);

alter table public.notifications enable row level security;

create policy "Users can manage their own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
