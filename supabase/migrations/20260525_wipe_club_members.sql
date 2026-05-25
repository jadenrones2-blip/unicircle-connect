-- Wipe ALL member-related state for a single club (external DB).
-- Run in the EXTERNAL Supabase SQL editor:
--   https://supabase.com/dashboard/project/tayhvgmterjzolvodwow/sql
--
-- Targets the Startup Incubator club. Other clubs are untouched.
-- Keeps attendance_sessions (meeting records) intact; only clears
-- attendance check-ins, point ledger, and the member roster itself.

DO $$
DECLARE
  v_club_id text := 'c4febc54-c754-4da2-8bec-5aaa79d123bd';
BEGIN
  DELETE FROM public.attendance_records
  WHERE session_id IN (
    SELECT id FROM public.attendance_sessions WHERE club_id = v_club_id
  );

  DELETE FROM public.point_transactions
  WHERE club_id = v_club_id;

  DELETE FROM public.club_members
  WHERE club_id = v_club_id;
END $$;

-- Verify
SELECT
  (SELECT count(*) FROM public.club_members        WHERE club_id = 'c4febc54-c754-4da2-8bec-5aaa79d123bd') AS members_left,
  (SELECT count(*) FROM public.point_transactions  WHERE club_id = 'c4febc54-c754-4da2-8bec-5aaa79d123bd') AS points_left,
  (SELECT count(*) FROM public.attendance_records  WHERE session_id IN (
     SELECT id FROM public.attendance_sessions WHERE club_id = 'c4febc54-c754-4da2-8bec-5aaa79d123bd'
  )) AS attendance_left;
