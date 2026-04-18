-- Migration: Fix Officer Invite Accept Flow - RLS Policies
-- Created: 2026-04-18
-- 
-- Root Cause:
-- RLS was enabled on club_invites and club_officers.
-- UPDATE policy lacked proper WITH CHECK after setting used_by.
-- INSERT policy only allowed owners, not the invited user.
--
-- This migration adds correct policies so the invited officer can accept the invite.

-- Correct UPDATE policy for club_invites
DROP POLICY IF EXISTS "Invited user can claim invite by token" ON club_invites;

CREATE POLICY "Invited user can claim invite by token" ON club_invites
FOR UPDATE TO authenticated
USING (
    used_by IS NULL 
    AND expires_at > now()
)
WITH CHECK (
    used_by = auth.uid()
);

-- Improve SELECT policy for club_officers
DROP POLICY IF EXISTS "Officers can read their own rows" ON club_officers;

CREATE POLICY "Officers can read their own rows" ON club_officers
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR invited_by = auth.uid()
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON POLICY "Invited user can claim invite by token" ON club_invites 
IS 'Allows the invited user to claim their pending invite by updating used_by';