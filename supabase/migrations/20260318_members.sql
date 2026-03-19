-- ================================================================
-- Club Members roster — officer-managed, stored in external DB
-- (tayhvgmterjzolvodwow)
-- Distinct from club_memberships (student-owned, in auth project)
-- ================================================================

create table if not exists public.club_members (
  id          uuid default gen_random_uuid() primary key,
  club_id     text not null,
  name        text not null,
  email       text,
  pid         text,   -- UCSD PID (e.g. A12345678)
  major       text,
  year        text check (year in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other')),
  status      text default 'active' check (status in ('active', 'inactive', 'alumni')),
  role        text default 'member' check (role in ('member', 'officer')),
  joined_at   date,
  notes       text,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

create index if not exists club_members_club_id_idx on public.club_members(club_id);
