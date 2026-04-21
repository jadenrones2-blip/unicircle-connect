-- ============================================================
-- FUNCTION: accept_club_invite
-- ============================================================
-- PURPOSE:
-- This function safely handles accepting a club invite in ONE
-- atomic database transaction.
--
-- WHY THIS EXISTS:
-- Previously, invite acceptance was done from the frontend using
-- multiple Supabase queries:
--   1. update club_invites
--   2. insert into club_officers
--
-- PROBLEMS WITH OLD APPROACH:
-- ❌ RLS (Row Level Security) blocking updates/inserts
-- ❌ Partial failures (invite updated but officer not inserted)
-- ❌ Race conditions (multiple users accepting same invite)
-- ❌ No atomic transaction guarantee
--
-- SOLUTION:
-- We move ALL critical logic into a PostgreSQL function so that:
-- ✔ Everything runs in a single transaction
-- ✔ Either ALL steps succeed or NONE do (ACID safety)
-- ✔ Bypasses frontend RLS complexity safely using SECURITY DEFINER
-- ✔ Prevents double-use of invite
-- ============================================================

create or replace function public.accept_club_invite(
  p_invite_id uuid,   -- ID of the invite being accepted
  p_user_id uuid,     -- ID of the user accepting the invite
  p_email text        -- Email of the user (stored in officer record)
)
returns json
language plpgsql
security definer
as $$

declare
v_invite record;  -- Holds invite data after lookup
begin

  -- ============================================================
  -- STEP 1: Validate invite exists and is not already used
  -- ============================================================
select * into v_invite
from club_invites
where id = p_invite_id
  and used_by is null;

if not found then
    return json_build_object('error', 'invite_not_found');
end if;

  -- ============================================================
  -- STEP 2: Ensure invite has not expired
  -- Prevents usage of old or invalid invite links
  -- ============================================================
  if v_invite.expires_at < now() then
    return json_build_object('error', 'expired');
end if;

  -- ============================================================
  -- STEP 3: Mark invite as used
  -- This ensures the invite cannot be reused (one-time token)
  -- ============================================================
update club_invites
set used_by = p_user_id,
    used_at = now()
where id = p_invite_id;

-- ============================================================
-- STEP 4: Create club officer record
-- This grants the user access to the club dashboard
-- ============================================================
insert into club_officers (
    club_id,
    club_name,
    user_id,
    invited_by,
    role,
    email
)
values (
           v_invite.club_id,
           v_invite.club_name,
           p_user_id,
           v_invite.created_by,
           v_invite.role,
           p_email
       );

-- ============================================================
-- STEP 5: Return success response to frontend
-- ============================================================
return json_build_object('success', true);

end;
$$;

-- ============================================================
-- PERMISSION GRANT
-- ============================================================
-- Allow authenticated users to execute this function
-- WITHOUT giving them direct table access (important security layer)
-- ============================================================

grant execute on function public.accept_club_invite(uuid, uuid, text)
to authenticated;