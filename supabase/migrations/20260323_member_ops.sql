-- ============================================================
-- Member Ops: Dues, Attendance, Points
-- Run this in the EXTERNAL DB (tayhvgmterjzolvodwow)
-- ============================================================

-- Add dues + points columns to existing club_members table
ALTER TABLE public.club_members
  ADD COLUMN IF NOT EXISTS dues_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dues_amount decimal(10,2),
  ADD COLUMN IF NOT EXISTS dues_due_date date,
  ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- Attendance sessions (e.g. "Weekly Meeting Mar 15")
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id text NOT NULL,
  name text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Per-session attendance per member
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.club_members(id) ON DELETE CASCADE,
  present boolean DEFAULT false,
  UNIQUE(session_id, member_id)
);

-- Point transactions log
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id text NOT NULL,
  member_id uuid REFERENCES public.club_members(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_club ON public.attendance_sessions(club_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_member ON public.attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_club ON public.point_transactions(club_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_member ON public.point_transactions(member_id);
