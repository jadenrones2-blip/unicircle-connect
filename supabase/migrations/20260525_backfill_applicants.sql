-- One-shot backfill: copy existing `people` rows into `applicants` so they
-- appear in the Recruitment kanban / Applicants view.
--
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm/sql
--
-- Safe to re-run: skips rows that already exist in applicants (matched by
-- club_id + email).

INSERT INTO public.applicants
  (club_id, stage_id, first_name, last_name, email, major, year, notes)
SELECT
  p.organization_id AS club_id,
  -- Drop everyone into the first recruitment stage (lowest order_index).
  -- Move them later in the kanban / People tab if you need other stages.
  (
    SELECT id
    FROM public.recruitment_stages
    WHERE club_id = p.organization_id
    ORDER BY order_index ASC
    LIMIT 1
  ) AS stage_id,
  p.first_name,
  COALESCE(NULLIF(p.last_name, ''), '—') AS last_name,
  p.email,
  p.major,
  p.year,
  p.notes
FROM public.people p
WHERE p.email IS NOT NULL
  AND p.email <> ''
  AND p.first_name IS NOT NULL
  AND p.first_name <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.applicants a
    WHERE a.club_id = p.organization_id
      AND lower(a.email) = lower(p.email)
  );

-- Report how many landed
SELECT
  club_id,
  count(*) AS applicants_total
FROM public.applicants
GROUP BY club_id
ORDER BY club_id;
