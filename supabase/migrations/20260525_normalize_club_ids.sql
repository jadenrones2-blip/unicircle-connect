-- Diagnose & fix the RLS mismatch for Startup Incubator deletes.
-- Run in main DB SQL editor:
--   https://supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm/sql

-- ── 1. Show what's stored where (look for casing / whitespace differences) ──
SELECT 'club_owners' AS source, user_id::text AS uid, club_id,
       length(club_id) AS len,
       club_id = trim(lower(club_id)) AS is_normalized
FROM public.club_owners
WHERE lower(trim(club_id)) LIKE '%c4febc54%';

SELECT 'applicants distinct' AS source, NULL::text AS uid, club_id,
       length(club_id) AS len,
       club_id = trim(lower(club_id)) AS is_normalized,
       count(*) AS rows
FROM public.applicants
WHERE lower(trim(club_id)) LIKE '%c4febc54%'
GROUP BY club_id;

SELECT 'people distinct' AS source, NULL::text AS uid, organization_id AS club_id,
       length(organization_id) AS len,
       organization_id = trim(lower(organization_id)) AS is_normalized,
       count(*) AS rows
FROM public.people
WHERE lower(trim(organization_id)) LIKE '%c4febc54%'
GROUP BY organization_id;

-- ── 2. Normalize every Startup-Incubator row to the lowercase trimmed UUID ──
DO $$
DECLARE
  canonical text := 'c4febc54-c754-4da2-8bec-5aaa79d123bd';
BEGIN
  UPDATE public.club_owners
  SET club_id = canonical
  WHERE lower(trim(club_id)) = canonical
    AND club_id <> canonical;

  UPDATE public.club_officers
  SET club_id = canonical
  WHERE lower(trim(club_id)) = canonical
    AND club_id <> canonical;

  UPDATE public.applicants
  SET club_id = canonical
  WHERE lower(trim(club_id)) = canonical
    AND club_id <> canonical;

  UPDATE public.recruitment_stages
  SET club_id = canonical
  WHERE lower(trim(club_id)) = canonical
    AND club_id <> canonical;

  UPDATE public.people
  SET organization_id = canonical
  WHERE lower(trim(organization_id)) = canonical
    AND organization_id <> canonical;
END $$;

NOTIFY pgrst, 'reload schema';

-- ── 3. Verify normalization worked ──────────────────────────────────────────
SELECT 'after fix — club_owners' AS check, user_id::text AS detail, club_id, length(club_id) AS len
FROM public.club_owners
WHERE club_id = 'c4febc54-c754-4da2-8bec-5aaa79d123bd';

SELECT 'after fix — applicants count' AS check, NULL AS detail, club_id, count(*)::text AS len
FROM public.applicants
WHERE club_id = 'c4febc54-c754-4da2-8bec-5aaa79d123bd'
GROUP BY club_id;
