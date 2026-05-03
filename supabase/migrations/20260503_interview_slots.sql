-- Interview slots table
-- Run this in the MAIN Supabase dashboard (xvaoxmqmnmhbnpwobpmm)

CREATE TABLE IF NOT EXISTS interview_slots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  booked_by_applicant_id uuid REFERENCES applicants(id) ON DELETE SET NULL,
  booked_by_name text,
  booked_by_email text,
  booked_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_slots_club_id_idx ON interview_slots(club_id);
CREATE INDEX IF NOT EXISTS interview_slots_date_idx ON interview_slots(date);

ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can view slots — needed for the public booking page
CREATE POLICY "Public can view interview slots"
  ON interview_slots FOR SELECT USING (true);

-- Authenticated users can create slots for clubs they manage
CREATE POLICY "Officers can create slots"
  ON interview_slots FOR INSERT TO authenticated WITH CHECK (true);

-- Officers can delete unbooked slots they created
CREATE POLICY "Officers can delete own slots"
  ON interview_slots FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND booked_by_applicant_id IS NULL);

-- Anyone (anon students) can book an available slot
CREATE POLICY "Students can book available slots"
  ON interview_slots FOR UPDATE
  USING (booked_by_applicant_id IS NULL)
  WITH CHECK (true);
