-- Club Inbox: students message clubs directly from their profile page
CREATE TABLE IF NOT EXISTS public.club_messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     text NOT NULL,
  sender_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text,
  sender_email text,
  subject     text,
  body        text NOT NULL,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_messages_club_id_idx ON public.club_messages(club_id);
CREATE INDEX IF NOT EXISTS club_messages_read_idx    ON public.club_messages(read);

ALTER TABLE public.club_messages ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can send a message
CREATE POLICY "Authenticated users can send messages"
  ON public.club_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Club owners and officers can read their club's messages
CREATE POLICY "Club owners can read messages"
  ON public.club_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE club_owners.user_id = auth.uid()
        AND club_owners.club_id = club_messages.club_id
    )
    OR EXISTS (
      SELECT 1 FROM public.club_officers
      WHERE club_officers.user_id = auth.uid()
        AND club_officers.club_id = club_messages.club_id
    )
  );

-- Club owners can mark messages as read
CREATE POLICY "Club owners can update messages"
  ON public.club_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owners
      WHERE club_owners.user_id = auth.uid()
        AND club_owners.club_id = club_messages.club_id
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.club_messages;
