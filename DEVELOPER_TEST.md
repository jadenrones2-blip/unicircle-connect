# UniCircle — Developer Test

Hey, thanks for taking the time. Before we talk about working together full-time, I want to see how you work on a real codebase with real bugs.

Two tasks below. Both come from bugs that already exist in production. I've documented everything you need to get started — nothing is hidden.

---

## Getting Started

**Repo:** `https://github.com/jadenrones2-blip/unicircle-connect`

**Stack:** React + TypeScript + Vite, Supabase, Tailwind CSS

**First thing to do:** Read `BUGS_AND_FIXES.md` in the repo root. It explains the full architecture — two Supabase instances, how RLS works in this project, edge functions, everything. Don't skip this.

**Setup:**
```bash
git clone https://github.com/jadenrones2-blip/unicircle-connect
cd unicircle-connect
npm install
npm run dev
```

You'll need a `.env` file — message me and I'll send it over.

---

## Task 1 — Fix Officer Invite Accept Flow

**Files:** `src/pages/AcceptInvite.tsx`, Supabase dashboard (credentials below)

**Estimated time:** 2–4 hours

### What's broken

When a club owner invites an officer, they enter their email in Club Admin → Team. The system creates an invite record and sends an email with a link to `/invite/:token`.

When the officer clicks that link, they should be added to the club. Instead they get this error:

> `Failed to accept invite: new row violates row-level security policy for table "club_invites"`

### What we know so far

- RLS has been disabled on both `club_invites` and `club_officers` (confirmed)
- Running `NOTIFY pgrst, 'reload schema'` didn't fix it
- The error says `club_invites` but the real blocker might be a database trigger firing on that table that touches another table which still has RLS enabled

### Where to start

Log into the Supabase dashboard for the main project and run these queries in the SQL editor:

```sql
-- 1. Check if there are any triggers on these tables
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('club_invites', 'club_officers');

-- 2. Confirm RLS is actually off (should be false for both)
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('club_invites', 'club_officers');

-- 3. Check API logs for the exact policy name blocking the request
-- Go to: Dashboard → Logs → API logs → search for error code 42501
```

Then read through `AcceptInvite.tsx` and trace every database operation that happens when the officer clicks accept. Figure out which specific operation is failing and why.

### How to verify

1. Ask me for a club owner test account
2. Go to Club Admin → Team → invite a test email address
3. Open the invite link in a separate incognito window
4. Accept the invite — no error should appear
5. Check the Supabase dashboard and confirm a row was created in `club_officers`

### What to deliver

A pull request with any code changes needed. If the fix required SQL (like dropping a trigger, fixing a policy, or modifying a table), include it as a file in `supabase/migrations/` with a comment explaining what it does. Add a short note in the PR description explaining what the root cause was — I want to understand what you found.

---

## Task 2 — Fix Resume Upload on Student Profile

**Files:** `src/pages/StudentProfile.tsx`, `supabase/functions/upload-resume/index.ts`

**Estimated time:** 2–4 hours

### What's broken

Students can't upload a resume from their profile page at `/profile`. The upload button is currently disabled with a "Coming soon" label because it's broken — your job is to fix it and re-enable it.

When it was active, students got this error:
> `Edge Function returned a non-2xx status code`

### What we know so far

- The frontend calls the `upload-resume` Supabase Edge Function using raw `fetch()` with the user's `access_token` in the Authorization header
- The edge function at `supabase/functions/upload-resume/index.ts` verifies the JWT before accepting the file
- The JWT verification was using the anon client (`anonClient.auth.getUser(token)`) — this fails when the frontend key is in `sb_publishable_` format
- A fix was attempted: swap to `serviceClient.auth.getUser(token)` (service role bypasses key format issues) — but the function was redeployed and still returned a non-2xx error
- Root cause after that point is unknown — the Supabase Edge Function logs will have the actual error

### What to investigate

1. Go to Supabase dashboard → project `xvaoxmqmnmhbnpwobpmm` → Edge Functions → `upload-resume` → Logs
2. Find the actual error message — not just the 4xx status
3. Confirm these secrets are set under Edge Functions → Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. Check that the `resumes` storage bucket exists (Storage tab in dashboard)
5. Read `supabase/functions/upload-resume/index.ts` — verify the JWT verification uses `serviceClient`, not `anonClient`

The frontend call in `StudentProfile.tsx` uses raw `fetch()` — do not change it to `supabase.functions.invoke()`. That breaks the multipart `Content-Type` boundary on FormData uploads.

### What to fix

Fix whatever is causing the edge function to return a non-2xx. Then re-enable the upload UI in `StudentProfile.tsx` — replace the "Coming soon" placeholder (added recently) with the working upload UI.

The upload UI should:
- Show a dashed upload area when no resume is uploaded
- Show the filename + a View link + Replace + Remove buttons when a resume exists
- Accept PDF only, max 10MB
- On success, save the returned URL to the user's profile

### How to verify

1. Log in as a student account
2. Go to `/profile`
3. Upload a PDF resume
4. No error — the file should appear with a View link
5. Refresh the page — the resume should still be there (persisted to the profile)
6. Test Replace and Remove

### What to deliver

A PR with the edge function fix and the re-enabled UI in `StudentProfile.tsx`. Include a short note in the PR explaining what the root cause was and what you changed in the edge function.

---

## Rules for All Tasks

- Run `npx vite build` before submitting. If it doesn't build, it's not done.
- Don't refactor or clean up code outside the scope of the fix.
- One PR per task.
- If you're stuck, message me — I'd rather you ask than spin for hours.

---

## Supabase Access

I'll DM you the credentials. The two projects are:

| Project | Used for |
|---------|----------|
| Main (`xvaoxmqmnmhbnpwobpmm`) | Auth, users, recruitment, invites |
| External (`tayhvgmterjzolvodwow`) | Clubs, events |

For Task 2 you'll only need the main project.

---

Questions? Message me directly.

— Jaden
