# UniCircle Connect — Known Issues & Engineer Checklist

## Status Key
- ✅ Fixed
- 🔴 Still broken / not started
- ⚠️ Partially fixed / needs verification

---

## Engineer Onboarding — Start Here

Before touching any code, you need to understand the two-database architecture:

| What | Where | Project ID |
|------|-------|------------|
| Auth, users, applicants, recruitment, notifications | Supabase **Main** | `xvaoxmqmnmhbnpwobpmm` |
| Clubs, events (read + write) | Supabase **External** | `tayhvgmterjzolvodwow` |

**SQL migrations in `supabase/migrations/` are documentation only.** Run them manually in the Supabase dashboard SQL editor — they do not auto-apply.

### How to claim a club and set up as admin (current flow)

1. Club leader goes to `/club-admin/request` and fills out the onboarding form
2. Jaden reviews it in `/admin/requests` (must have `user_roles` row with `role = 'admin'`)
3. On approval, Jaden manually inserts a row into `club_owners` (main DB):
   ```sql
   INSERT INTO club_owners (user_id, club_id) VALUES ('<uuid>', '<club-id>');
   ```
4. Club ID must match exactly what's in the external DB clubs table — lowercase, no trailing spaces
5. After that row exists, the user sees the Club Admin portal on next login

**Known gap:** There is no automated flow that creates the `club_owners` row. It requires a manual SQL insert by Jaden. This is a task for the engineer to automate.

### How to add an officer

1. Club owner goes to Club Admin → Team tab
2. Enters officer's email → system creates a row in `club_invites` and sends an email with a link to `/invite/:token`
3. Officer clicks link, lands on `AcceptInvite.tsx` → page inserts a row into `club_officers`
4. Officer now has access to the club's recruitment pipeline (read + score, not edit club settings)

---

## Bug Index

| # | Bug | Status |
|---|-----|--------|
| 1 | Site loading slowly (N×M DB queries) | ✅ Fixed |
| 2 | Avatar photo upload failing | ✅ Fixed |
| 3 | Resume upload on StudentProfile page | 🔴 Still failing |
| 4 | Resume upload on ClubApply (public applicant page) | ⚠️ Partially fixed |
| 5 | Application form schema cache error | ✅ Fixed |
| 6 | Officer invite — infinite reload loop | ✅ Fixed |
| 7 | Officer invite — RLS error on accept | 🔴 Still failing |
| 8 | Recruitment pipeline scoring errors | ✅ Fixed |
| 9 | Application form → link → pipeline data flow | 🔴 Needs end-to-end test |
| 10 | Club cover image not persisting | 🔴 Suspected external DB write issue |
| 11 | Event flyer AI analysis not working | 🔴 Missing env var likely |
| 12 | CSV import doesn't recognize "full name" column exactly | ⚠️ Handled but fragile |
| 13 | CSV export broken | 🔴 Unknown — needs test |
| 14 | "Add Member" manual button — should be removed | 🔴 Not done |
| 15 | Alumni tab in People roster | 🔴 No alumni stage exists — may be stale UI |
| 16 | Admin profile photo upload | 🔴 Needs verification |

---

## Detailed Bug Write-Ups

---

### 1. ✅ Site loading very slowly (constant spinners)

**Root cause:** Auth, club ownership, and clubs data were plain React hooks — every component that called `useAuth()`, `useClubOwnership()`, or `useClubs()` created its own Supabase subscription and DB query. 8+ simultaneous 1000-row fetches on a single page load.

**Fix applied:** Converted all three to singleton React context providers:
- `src/contexts/AuthContext.tsx`
- `src/contexts/ClubOwnershipContext.tsx`
- `src/contexts/ClubsContext.tsx`

---

### 2. ✅ Avatar photo upload failing in Profile Settings

**Root cause:** Supabase RLS on the `avatars` storage bucket was blocking direct browser uploads.

**Fix applied:** Supabase Edge Function `supabase/functions/upload-avatar/index.ts` uses the service role key to bypass RLS. `AdminProfileSettings.tsx` now POSTs to this function instead.

---

### 3. 🔴 Resume upload on StudentProfile page (`/profile`)

**What's happening:** Students get "Edge Function returned a non-2xx status code" when trying to upload a resume from their profile page.

**Root cause (identified):** The `upload-resume` edge function was using `anonClient.auth.getUser(token)` to verify the JWT. When the frontend is configured with a `sb_publishable_` format key (`VITE_SUPABASE_PUBLISHABLE_KEY`), the anon client rejects the token as invalid. Must use `serviceClient.auth.getUser(token)` instead (service role bypasses key format issues).

**Fix attempted:** Updated `supabase/functions/upload-resume/index.ts` to use service role client for token verification and redeployed. Still failing — needs further investigation.

**Next steps for engineer:**
1. Open Supabase dashboard → Edge Functions → `upload-resume` → Logs
2. Find the actual error message (not just the 4xx status)
3. Confirm the function has these secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. Check that the `resumes` bucket exists and has correct RLS policies (or no RLS since we bypass via service role)
5. The function code is at `supabase/functions/upload-resume/index.ts` — verify it's using `serviceClient` not `supabaseClient` for the `getUser()` call

**How `StudentProfile.tsx` calls it:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${supabaseUrl}/functions/v1/upload-resume`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${session.access_token}` },
  body: formData,  // FormData with 'file' field
});
```
Uses raw `fetch()` — NOT `supabase.functions.invoke()` — because `invoke()` breaks the multipart Content-Type boundary.

---

### 4. ⚠️ Resume upload on ClubApply page (public applicant)

**What's happening:** Public applicants (no login required) get an error when uploading a resume on `/clubs/:id/apply` or `/apply/:slug`.

**Root cause:** Public page has no auth token. Needed a separate edge function that accepts no JWT but validates the applicant record exists.

**Fix applied:** Created `supabase/functions/upload-applicant-resume/index.ts` — takes `file`, `applicant_id`, `club_id` as FormData. Verifies applicant exists, uses service role to bypass RLS, stores path in `applicants.resume_url`.

**Status:** Deployed via Supabase dashboard. Needs verification that `ClubApply.tsx` is correctly calling it and the response is being handled.

---

### 5. ✅ Application form builder — schema cache / crash errors

Fixed. Ran `NOTIFY pgrst, 'reload schema';` and added `isSchemaErr` fallback in `FormBuilder.tsx`. Also removed `.order('created_at')` from the load query.

---

### 6. ✅ Officer invite — infinite reload loop

Fixed. Added `claimAttempted = useRef(false)` guard in `AcceptInvite.tsx` to prevent the auto-claim `useEffect` from re-firing after each failure.

---

### 7. 🔴 Officer invite — RLS error on accept

**What's happening:** `Failed to accept invite: new row violates row-level security policy for table 'club_invites'`

**What we've tried:**
1. Disabled RLS on `club_invites` (confirmed `relrowsecurity: false`)
2. Disabled RLS on `club_officers`
3. Ran `NOTIFY pgrst, 'reload schema'`
4. Error persists through all of the above

**Current best theory:** There is a database trigger on `club_invites` or `club_officers` that fires on UPDATE/INSERT and touches another table that still has RLS enabled.

**Next steps for engineer:**
```sql
-- Check for triggers on these tables
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('club_invites', 'club_officers');

-- Confirm RLS is actually off (should be f for both)
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('club_invites', 'club_officers');

-- Check Supabase API logs for the exact RLS policy name that's blocking
-- Go to: dashboard → project → Logs → API logs → filter for 42501 (RLS violation)
```

If a trigger is found, either fix the trigger to use `SECURITY DEFINER` or drop it if it's not needed.

---

### 8. ✅ Recruitment pipeline — scoring errors

Fixed. Removed invalid FK constraint on `officer_rubric_scores`. Changed `officer_id` references to `voter_id` in `deliberation_votes` queries.

---

### 9. 🔴 Application form → apply link → pipeline data flow (end-to-end)

**What should happen:**
1. Club owner builds a form in Club Admin → Recruitment → Form tab (`FormBuilder.tsx`)
2. Saves questions to `application_forms` table (main DB) — keyed by `club_id`
3. Student visits `/apply/:slug` or `/clubs/:id/apply`
4. Page fetches the form questions and renders them
5. On submit: inserts into `applicants` table with responses stored in `answers` jsonb field
6. Club owner sees applicant card appear in the kanban pipeline
7. Clicking a card opens `ApplicantDetailDrawer.tsx` — shows all answers with question labels
8. Officers score the applicant on rubric criteria in the drawer

**Known gaps / things to verify:**
- The slug in `/apply/:slug` must map to a real `club_id` — check `ApplyBySlug.tsx` for how it resolves
- `application_forms` stores questions as `{ id: uuid, label: string, type: string }[]` — the AI summary function in the edge function fetches these to map IDs to labels
- If `application_forms` row doesn't exist for a club, `ClubApply.tsx` should render standard fields only (no crash)
- After submit, the `notify-applicant-stage` edge function is called with `type: 'application_received'` — if this fails, the applicant still goes in but no email is sent

**How to test end-to-end:**
1. Log in as a club owner, go to Club Admin → Recruitment → Form
2. Add at least 2 custom questions, save
3. Open the apply link in a new incognito window
4. Fill out and submit the application
5. Confirm the applicant card appears in the kanban immediately (realtime is enabled)
6. Click the card — verify answers show up with correct question labels (not raw UUIDs)
7. Try scoring and voting as an officer

---

### 10. 🔴 Club cover image not persisting (Kappa Kappa Gamma example)

**What's happening:** Club owners upload a new cover image, save the form, but the image reverts to the old one (or blank) on page reload.

**Root cause (suspected):** Club data (including `cover_image`) lives in the **external DB** (`tayhvgmterjzolvodwow`). `ClubAdminEdit.tsx` saves via `dataClient`. The `dataClient` anon key must be the raw JWT format (`eyJ...`) — if it's set to the `sb_publishable_` key format, writes will be rejected silently at the API gateway.

**Files to check:**
- `src/integrations/supabase/dataClient.ts` — verify the `VITE_EXTERNAL_SUPABASE_ANON_KEY` env var is the raw JWT
- After saving, `console.log` the response from `dataClient.from('clubs').update(...)` to confirm `error` is null

**Next steps for engineer:**
1. Open browser devtools → Network tab → look for the PATCH request to `tayhvgmterjzolvodwow.supabase.co`
2. Check the response status and body
3. If 401: the key is wrong format — replace `VITE_EXTERNAL_SUPABASE_ANON_KEY` in `.env` with the correct JWT
4. If 403: external DB has RLS enabled on the `clubs` table that needs a policy for UPDATE
5. If 200 but image still reverts: the `cover_image` column may not exist on the external `clubs` table — check schema

---

### 11. 🔴 Event flyer AI analysis not working

**What's happening:** Uploading a flyer on the Submit Event page doesn't auto-fill the fields. The "Analyzing flyer…" spinner appears then fails.

**Root cause (most likely):** The `extract-event-from-flyer` edge function requires `ANTHROPIC_API_KEY` to be set as a Supabase secret. If it's not set, the function returns `{ success: false, error: "ANTHROPIC_API_KEY not configured" }`.

**Files involved:**
- `src/components/club-admin/FlyerAutoFill.tsx` — frontend component, calls the edge function via raw `fetch()`
- `supabase/functions/extract-event-from-flyer/index.ts` — edge function, uses Claude API

**Next steps for engineer:**
1. Go to Supabase dashboard → project `xvaoxmqmnmhbnpwobpmm` → Edge Functions → Secrets
2. Confirm `ANTHROPIC_API_KEY` is set (it should be the same key used for AI applicant screening)
3. If it's set, check Edge Functions → `extract-event-from-flyer` → Logs for the actual error
4. The function is deployed — if it's not there, deploy with: `npx supabase functions deploy extract-event-from-flyer --project-ref xvaoxmqmnmhbnpwobpmm` (run from the repo root)

---

### 12. ⚠️ CSV import — column name recognition

**What's happening:** When officers import a CSV with a "Full Name" column (single column, not split first/last), the parser may not recognize it.

**Current behavior:** `OrgPeopleDashboard.tsx` (around line 252) handles these column names:
- `name`, `full_name`, `fullname`, `student_name`, `applicant_name` (combined name columns)
- `first_name`, `firstname` (first name)
- `last_name`, `lastname`, `surname` (last name)

**Known gap:** "Full Name" with a capital F and capital N (as Excel exports it) becomes `full name` with a space after `.toLowerCase()` — the parser checks `full_name` with an underscore, not `full name` with a space. Raw headers from Excel often come through as-is.

**Fix needed (small, 5-minute fix):**
In `src/pages/OrgPeopleDashboard.tsx`, update the `handleFileChange` parsing block to normalize header names before matching:
```typescript
// Normalize headers: lowercase, replace spaces with underscores
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '_');
// Then match against normalize(header) instead of header directly
```

---

### 13. 🔴 CSV export broken

**Status:** Not verified. The export logic exists in `OrgPeopleDashboard.tsx` (around line 217-236) using `Papa.unparse()`. Needs a live test to confirm whether it works or silently fails.

**How to test:**
1. Add 2-3 people to a club's People roster
2. Click "Export CSV"
3. Confirm a `.csv` file downloads with the correct data

**If it's broken:** Check the browser console for errors and whether `people` state array is populated at the time of export.

---

### 14. 🔴 "Add Member" manual button — remove it

**What's happening:** There's a manual "Add Person" dialog in the People roster (`OrgPeopleDashboard.tsx`). The intended flow is that people come in through CSV import or from the applicant pipeline — not manual entry.

**What to remove:**
- The "+" / "Add Person" button that opens the `addOpen` dialog (around line 84, 519-570)
- The `handleAddPerson` function (around line 186-213)
- The `addOpen`, `adding`, `form` state variables
- The `<Dialog>` block for adding a person (lines ~519-580)

**Keep:** CSV import, CSV export, the template download button.

---

### 15. 🔴 Alumni tab in People roster — clarify or remove

**Status:** The `STAGES` array in `OrgPeopleDashboard.tsx` is:
```typescript
['member', 'applied', 'under_review', 'interview', 'accepted', 'rejected']
```
There is no `alumni` stage defined. If the user is seeing an "Alumni" tab somewhere, it's either:
- A leftover UI element from an older design (search the codebase for "alumni")
- Data in the `people` table with `stage = 'alumni'` that doesn't match any defined stage (would show under "All" but not any stage filter)

**Next steps:** Search the codebase for `alumni` and remove any UI references. If the feature is wanted later, add `'alumni'` to `STAGES` and add it to `STAGE_COLORS` and `STAGE_LABELS`.

---

### 16. 🔴 Admin profile photo upload — needs verification

**What's happening:** Club admins may be unable to upload a profile photo from `/club-admin/profile`.

**What should work:** `AdminProfileSettings.tsx` POSTs to the `upload-avatar` edge function (same fix as Bug #2). This was built but needs live verification that:
1. The edge function is deployed (`upload-avatar`)
2. `SUPABASE_SERVICE_ROLE_KEY` is set in edge function secrets
3. The `avatars` bucket exists and is public

**How to verify:** Log in as a club admin, go to `/club-admin/profile`, try uploading a photo. Check the browser Network tab for the request to `functions/v1/upload-avatar`.

---

## General Notes for Engineers

### Architecture

**Two Supabase projects:**
- **Main** (`xvaoxmqmnmhbnpwobpmm`) — auth, profiles, applicants, recruitment pipeline, notifications, edge functions
- **External** (`tayhvgmterjzolvodwow`) — clubs, events (via `dataClient` in `src/integrations/supabase/dataClient.ts`)

The `dataClient` key MUST be the raw anon JWT (`eyJ...`), NOT the `sb_publishable_` format key. The publishable key only allows reads — writes are rejected at the API gateway.

### RLS (Row Level Security)

RLS has been a persistent source of bugs throughout this project. When something is blocked silently:
1. Check if RLS is enabled on the table: `SELECT relrowsecurity FROM pg_class WHERE relname = 'table_name';`
2. If on, either add the appropriate policy or disable RLS for that table
3. After any RLS change, run `NOTIFY pgrst, 'reload schema';` to flush PostgREST cache

Tables with confirmed RLS issues (disabled or bypassed):
- `club_invites` — RLS disabled
- `club_officers` — RLS disabled
- `avatars` bucket — bypassed via `upload-avatar` edge function
- `resumes` bucket — bypassed via `upload-resume` edge function (still having issues)

### Code Conventions

- Tables not in the generated Supabase types use `(supabase as any)` casting: `club_officers`, `club_invites`, `people`, `officer_rubric_scores`, `deliberation_votes`, `application_forms`
- `clubId` values must always be `.trim().toLowerCase()` before comparison — raw equality fails silently
- Edge functions are Deno — do NOT import `supabase-js` via `esm.sh` (causes EarlyDrop at startup). Use lightweight Bearer token validation instead.
- `supabase.functions.invoke()` breaks multipart FormData — use raw `fetch()` for file uploads
- All user-facing errors use `toast.error()` from sonner — never silent failures

### Edge Functions

All edge functions live in `supabase/functions/`. Currently deployed:
- `upload-avatar` — profile photo upload (service role, bypasses RLS)
- `upload-resume` — authenticated resume upload for student profile
- `upload-applicant-resume` — public resume upload for job applicants (no auth)
- `notify-applicant-stage` — sends emails on application events (received, stage advance, decision)
- `notify-club-request` — sends emails for club onboarding requests
- `extract-event-from-flyer` — Claude vision API to parse event details from a flyer image
- `screen-applicant` — Claude AI applicant screening summary

Required secrets (set in Supabase → Edge Functions → Secrets):
- `SUPABASE_SERVICE_ROLE_KEY` — needed by upload functions
- `ANTHROPIC_API_KEY` — needed by AI functions
- `RESEND_API_KEY` — needed by notification functions

### Deployment

- Vercel auto-deploys on push to `main` — no manual step needed
- Edge functions must be deployed separately via Supabase CLI or dashboard
- After deploying an edge function, it takes ~30 seconds to be live
- Always hard refresh after a deploy before debugging (Cmd+Shift+R on Mac)

### Build Check

Before saying anything is done, always run:
```bash
npx vite build
```
Do NOT use `tsc --noEmit` — it hangs.
