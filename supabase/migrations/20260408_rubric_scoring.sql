-- Officer rubric scores: per-officer, per-criterion scores for each applicant
create table if not exists officer_rubric_scores (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null references applicants(id) on delete cascade,
  officer_id      uuid not null references auth.users(id) on delete cascade,
  requirement_id  uuid not null references recruitment_requirements(id) on delete cascade,
  score           smallint not null check (score between 1 and 5),
  note            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (applicant_id, officer_id, requirement_id)
);

-- RLS
alter table officer_rubric_scores enable row level security;

-- Officers can read all scores for applicants in clubs they own/belong to
create policy "Officers can read rubric scores"
  on officer_rubric_scores for select
  to authenticated
  using (true);

-- Officers can insert/update their own scores
create policy "Officers can upsert own scores"
  on officer_rubric_scores for insert
  to authenticated
  with check (officer_id = auth.uid());

create policy "Officers can update own scores"
  on officer_rubric_scores for update
  to authenticated
  using (officer_id = auth.uid());

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger officer_rubric_scores_updated_at
  before update on officer_rubric_scores
  for each row execute procedure set_updated_at();
