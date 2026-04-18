-- Fix: Officer invite accept flow fails with RLS error
--
-- Root cause: AcceptInvite.tsx was calling two separate table operations
-- (UPDATE club_invites + INSERT club_officers) as the anon/authenticated user.
-- Even with RLS disabled on both tables, a trigger on club_invites or club_officers
-- may fire and touch another table (e.g. notifications) that still has RLS enabled,
-- causing: "new row violates row-level security policy for table 'club_invites'"
--
-- Fix: This SECURITY DEFINER function runs as the DB owner, bypassing RLS on all
-- tables it touches (including any trigger-invoked tables). The frontend now calls
-- supabase.rpc('accept_club_invite', ...) instead of two direct table writes.
--
-- Run this in: Supabase dashboard → project xvaoxmqmnmhbnpwobpmm → SQL editor

CREATE OR REPLACE FUNCTION accept_club_invite(
  p_invite_id uuid,
  p_user_id   uuid,
  p_email     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  -- Lock the row so concurrent accepts don't both succeed
  SELECT * INTO v_invite
  FROM club_invites
  WHERE id = p_invite_id
    AND used_by IS NULL
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invite_not_found');
  END IF;

  IF v_invite.expires_at <= now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- Mark invite used
  UPDATE club_invites
  SET used_by  = p_user_id,
      used_at  = now()
  WHERE id = p_invite_id;

  -- Insert officer row (silently ignore if already exists)
  INSERT INTO club_officers (club_id, club_name, user_id, invited_by, role, email)
  VALUES (v_invite.club_id, v_invite.club_name, p_user_id, v_invite.created_by, v_invite.role, p_email)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'club_id', v_invite.club_id);
END;
$$;

-- Allow both authenticated users (sign-in flow) and anon (sign-up + confirm flow)
GRANT EXECUTE ON FUNCTION accept_club_invite(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_club_invite(uuid, uuid, text) TO anon;
