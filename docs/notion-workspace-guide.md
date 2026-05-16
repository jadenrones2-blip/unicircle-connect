# UniCircle Connect — Notion Workspace Blueprint

> Build this top-to-bottom. Each section = one Notion page (or database). Sub-items = sub-pages inside it.

---

## 🏠 Home (Team Hub)
**Purpose:** First thing everyone sees. Acts as a command center.

**What to put here:**
- One-liner mission statement
- Quick links to every department section (use `/link` in Notion)
- Current sprint / priority (2–3 bullet points, manually updated weekly)
- Team roster table: Name | Role | Department | GitHub / Slack handle
- Link to the live app (unicircle.app) and staging URL
- Announcement block for major updates (pin to top)

---

## ⚙️ Software Engineering

### 1. How the Product Works (Architecture Overview)

UniCircle Connect is a React SPA (single-page app) deployed on Vercel. There is no custom backend — all data, auth, and server-side logic runs through **two Supabase projects** and **Supabase Edge Functions** (Deno).

```
Browser (React + Vite)
  ├── supabase client  →  Main DB (xvaoxmqmnmhbnpwobpmm)
  │                          auth, profiles, applicants, recruitment,
  │                          notifications, club_owners, club_officers
  │
  └── dataClient       →  External clubs DB (tayhvgmterjzolvodwow)
                             clubs, events, club_members, attendance
```

**Why two databases?**
The clubs/events data lives in a separate Supabase project that was set up earlier in the build. Auth and all recruitment/user data live in the main project. The `dataClient` in `src/integrations/supabase/dataClient.ts` handles reads from the external DB — its anon key is hardcoded (public, read-safe).

**Request flow for a typical page:**
1. React component mounts → calls a hook (e.g. `useRecruitment`, `useClubs`)
2. Hook queries Supabase via the appropriate client
3. Data is cached by React Query (`QueryClient`)
4. Mutations call Supabase directly (no REST layer) — then invalidate the cache
5. Realtime: `applicants` table has Supabase Realtime enabled — `useRecruitment` subscribes to INSERT/UPDATE so the kanban auto-refreshes

**Edge Functions** (Supabase/Deno, in `supabase/functions/`):
Run server-side logic that can't live in the browser — AI calls, email sending, web scraping, file parsing. Triggered via `supabase.functions.invoke()` from the frontend or by Supabase webhooks.

---

### 2. Dev Environment Setup

**Step 1 — Clone and install**
```bash
git clone https://github.com/jadenrones2-blip/unicircle-connect
cd unicircle-connect
npm install
```

**Step 2 — Create your `.env` file**
Copy this into a file called `.env` at the project root. Get the values from the person who set up the project (Jaden):

```env
# Main Supabase project (auth, profiles, recruitment)
VITE_SUPABASE_URL=https://xvaoxmqmnmhbnpwobpmm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<get from Jaden or Supabase dashboard>
```

> The external clubs DB (`tayhvgmterjzolvodwow`) uses a hardcoded anon key in `src/integrations/supabase/dataClient.ts` — no env var needed for it.

**Step 3 — Run locally**
```bash
npm run dev
```
Open http://localhost:8080

**Step 4 — Build check before any PR**
```bash
npx vite build
```
This must pass with zero errors. Never use `tsc --noEmit` — it hangs.

**Edge function env vars** (needed only if working on edge functions — ask Jaden):
```
ANTHROPIC_API_KEY           — AI screening + resume parsing (Claude Haiku)
SUPABASE_SERVICE_ROLE_KEY   — main DB service role (edge functions only)
MAIN_SVC_KEY                — alias used in some edge functions
EXTERNAL_SUPABASE_URL       — external clubs DB URL
EXTERNAL_SUPABASE_SERVICE_ROLE_KEY — external DB service role
```
Set these in the Supabase dashboard under Project Settings → Edge Functions → Secrets.

---

### 3. Student User Workflow (What a student does in the app)

This is the full journey a student takes — every step maps to a real shipped page.

```
1. Landing Page (/)
   Sees hero, value prop, CTA to sign up or discover clubs

2. Auth (/login or /signup)
   Signs up with email — Supabase sends confirmation email
   After confirming, redirected to /onboarding

   [OR] Google OAuth → /auth/callback → checks role → routes accordingly

3. Onboarding (/onboarding)
   Picks interest categories (stored in user_interests table)
   Sets up profile (name, year, major)

4. Dashboard (/dashboard)
   Personalized welcome hero
   Upcoming events from saved clubs
   Club spotlights
   Swipe-style onboarding card to explore

5. Discover (/discover)
   Auth-gated — redirects to login if not signed in
   Quick-browse interface for finding clubs

6. Clubs Directory (/clubs)
   Full searchable list of clubs with filters
   Match % badges based on interests + resume signals
   "Recommended for You" shelf (top 5 clubs, score ≥ 60)
   "Recruiting Now" filter persisted in localStorage
   AI recommendation chat widget (floating button)

7. Club Detail (/clubs/:id)
   Club profile: description, links, events, reviews
   "Apply Now" button if club.recruitingStatus === 'open'
   Club reviews tab (star rating, upsert per user)
   Club events pulled from external DB

8. Apply to Club (/clubs/:id/apply  OR  /apply/:slug)
   Public page — no auth required
   Standard fields + custom questions set by the club
   Resume upload (stored in `resumes` storage bucket)
   On submit: inserts into `applicants` table + triggers notify-applicant-stage email

9. Profile (/profile)
   Upload/remove resume → triggers parse-resume edge function
   Resume signals extracted by Claude, saved to profiles.resume_signals
   Used to improve club match scores

10. Events Calendar (/events or /calendar)
    Browse all upcoming events with search + filters
    RSVP button (event_rsvps table)
    Add to Google Calendar

11. Opportunities Board (/opportunities)
    Browse open roles/opportunities posted by clubs

12. Notifications (bell in header)
    In-app notification bell reads from notifications table
    Populated by edge functions on key events
```

---

### 4. Club Admin Workflow (What a club officer/owner does)

This is the full journey for a club running recruitment on UniCircle.

```
1. Request a Club (/club-admin/request)
   Public form — submits to new_club_requests table
   Triggers notify-club-request email to jaden@unicircle.app

2. Platform Admin Approves (/admin/requests)
   Admin sees pending requests, approves or rejects
   Approval email sent to the club via notify-club-request edge function

3. Claim/Verify Club (/verify-claim)
   Club owner verifies ownership of an existing club listing

4. Club Admin Dashboard (/club-admin)
   Lists all clubs the user owns or is an officer of
   Entry point to each club's management tabs

5. Club Management Tabs (/club-admin/clubs/:clubId/*)
   Each tab is a separate route:

   ├── /edit         — Edit club profile, description, links, images
   ├── /events       — Manage club events, submit new ones
   ├── /recruitment  — Full recruitment pipeline (see below)
   ├── /analytics    — Charts: applicants by stage, source, score dist.
   ├── /members      — Roster, dues, attendance, points
   ├── /team         — Officers: invite, manage roles
   ├── /people       — OrgPeopleDashboard (people table)
   ├── /pipeline     — OrgPipeline view
   ├── /scorecard    — OrgScorecard view
   ├── /spotlight    — Create club spotlight content
   └── /inbox        — Club inbox (ClubAdminInbox)

6. Recruitment Pipeline (/club-admin/clubs/:clubId/recruitment)

   Step A — Setup Wizard (first time)
     Define stages (e.g. Applied → Screening → Interview → Decision)
     One stage marked as is_intake (new applications land here)
     Build application form (FormBuilder — short/long/MC questions, drag to reorder)
     Set rubric criteria (strict = manual score, ai = Claude evaluates)
     AI criteria have a weight slider (1–5)

   Step B — Kanban View (ongoing)
     Drag applicants between stages
     Each card shows: name, score badge, match %
     4 view modes: Kanban / Table / Form Responses / Analytics

   Step C — Applicant Review (click any applicant)
     ApplicantDetailDrawer slides in from right
     Shows: full form responses, AI summary (Claude Haiku), resume link
     Officers vote Yes / No / Maybe (stored in deliberation_votes)
     Vote tally shown live
     Final decision dropdown (Accepted / Rejected / Waitlisted)
     Notes field

   Step D — Automated Emails (triggered automatically)
     application_received — when student submits
     stage_advance        — when moved to any new stage
     final_decision       — when accepted or rejected

7. Invite Officers (/club-admin/clubs/:clubId/team)
   Owner generates invite link (token via crypto.getRandomValues)
   Token stored in club_invites table
   Officer clicks link → /invite/:token → accepts → added to club_officers

8. Interview Booking (/interview/:clubId)
   Students can book interview slots (InterviewBooking page)
```

---

### 5. Shipped Edge Functions Reference

All live in `supabase/functions/`. Deploy with: `supabase functions deploy <name>`

| Function | What it does |
|---|---|
| `notify-applicant-stage` | Emails student on application_received, stage_advance, final_decision |
| `notify-club-request` | Emails admin + club on new request / approve / reject |
| `notify-event-approved` | Emails when a submitted event gets approved |
| `ai-screen-applicants` | Claude Haiku — scores applicants against rubric criteria |
| `parse-resume` | Downloads resume PDF from storage, sends to Claude, saves signals to profiles |
| `suggest-form-questions` | AI-suggested custom application questions |
| `upload-resume` | Handles resume file upload to `resumes` storage bucket |
| `upload-applicant-resume` | Resume upload for applicants (public, no auth) |
| `upload-avatar` | Profile photo upload to `avatars` bucket |
| `send-person-email` | Sends email to a person in the people roster |
| `handle-email-reply` | Processes inbound email replies to club inbox |
| `campus-search` | Search across UCSD campus data |
| `verify-club-claim` | Validates club ownership claim |
| `extract-resume-keywords` | Pulls keywords from a resume for matching |
| `extract-event-from-flyer` | Parses event details from an uploaded image/flyer |
| `scrape-club-websites` | Enriches club data from their websites |
| `scrape-instagram` / `scrape-instagram-apify` | Pulls club Instagram content |
| `scrape-events` / `scrape-events-multi` | Scrapes event listings |
| `scrape-luma-events` | Pulls events from Luma |
| `scrape-eventbrite` | Pulls events from Eventbrite |
| `scrape-csi` | Scrapes UCSD CSI club directory |
| `sync-club-eventbrite` | Syncs a club's Eventbrite events |
| `enrich-clubs` | Enriches club records with external data |
| `discover-club-websites` | Finds club website URLs |
| `external-db-proxy` | Proxy for external DB operations |
| `flag-food-events` | Tags events that include food |
| `notify-waitlist-signup` | Email when student joins a waitlist |

---

### 6. DB Schema Reference

**Main DB** (`xvaoxmqmnmhbnpwobpmm`) — auth + recruitment:
- `profiles` — student profiles (name, year, major, resume_signals jsonb)
- `applicants` — kanban cards (has Realtime enabled)
- `recruitment_stages` — pipeline stages per club (has `is_intake` boolean)
- `recruitment_requirements` — rubric criteria (type: `'strict'` | `'ai'`, weight int)
- `officer_rubric_scores` — per-officer per-criterion scores
- `deliberation_votes` — Yes/No/Maybe per officer per applicant
- `application_forms` — custom form questions per club (jsonb)
- `recruitment_settings` — enabled/disabled + visibility per club
- `club_owners` — user_id → club_id (text)
- `club_officers` — invited officers per club
- `club_invites` — one-time invite tokens
- `people` — org roster (separate from applicants)
- `notifications` — in-app bell (user_id, type, title, body, read)
- `new_club_requests` — public club onboarding submissions
- `event_rsvps`, `club_reviews`, `opportunities`, `event_cohosts`

**External clubs DB** (`tayhvgmterjzolvodwow`):
- `clubs` — all club records
- `events` — all event records
- `club_members`, `attendance_sessions`, `attendance_records`, `point_transactions`

> SQL migrations in `supabase/migrations/` are docs only. Run them manually in the Supabase dashboard SQL editor. Never run `gen_random_bytes()` in SQL — pgcrypto is not available on the main project.

---

### 7. Key Source Files

| File | What it does |
|---|---|
| `src/App.tsx` | All routes — single source of truth for navigation |
| `src/integrations/supabase/client.ts` | Main Supabase client (auth DB) |
| `src/integrations/supabase/dataClient.ts` | External clubs DB client |
| `src/hooks/useRecruitment.ts` | Full recruitment state, stages, applicants, CRUD, realtime |
| `src/hooks/useRecruitmentRequirements.ts` | Rubric criteria from recruitment_requirements |
| `src/hooks/useRubricScoring.ts` | Per-officer scores, calcWeightedScore, teamAvgForCriterion |
| `src/hooks/useClubOwnership.ts` | isOwnerOf(), isOfficerOf(), ownedClubs |
| `src/hooks/useAuth.ts` | Current user |
| `src/hooks/useExternalDB.ts` | useClubs(), useEvents() from external DB |
| `src/lib/clubRecommendations.ts` | calculateMatchScore (60% interests / 40% resume), getTopMatchTerm |
| `src/lib/formatters.ts` | Date/time formatters for events |
| `src/components/recruitment/RecruitmentKanban.tsx` | Main pipeline UI |
| `src/components/recruitment/ApplicantDetailDrawer.tsx` | Slide-in applicant review panel |
| `src/components/recruitment/FormBuilder.tsx` | Custom application form builder |
| `src/pages/ClubApply.tsx` | Public student application page |
| `src/pages/ClubAdminRecruitment.tsx` | Recruitment page (owner + officer access) |
| `src/pages/OrgPeopleDashboard.tsx` | People/roster tab |
| `src/pages/ClubAdminAnalytics.tsx` | Analytics charts |

---

### 8. Routing Quick Reference

```
/                          Landing page
/login  /signup            Auth
/auth/callback             Google OAuth callback
/onboarding                New student interest setup
/dashboard                 Student home
/discover                  Auth-gated quick browse
/clubs                     Club directory
/clubs/:id                 Club detail
/clubs/:id/apply           Student apply (PUBLIC — no auth)
/apply/:slug               Apply by club slug
/clubs/:id/survey          Club survey
/profile                   Student profile + resume
/events  /calendar         Events calendar
/opportunities             Opportunities board
/invite/:token             Officer invite acceptance
/club-admin                Owner dashboard
/club-admin/clubs/:id/*    Owner/officer management tabs
  → /edit  /events  /recruitment  /analytics  /members
  → /team  /people  /pipeline  /scorecard  /spotlight  /inbox
/club-admin/request        Request a new club (public)
/admin/events              Platform admin — events
/admin/requests            Platform admin — club requests
/interview/:clubId         Interview booking
/tabling                   Tabling landing page
/demo  /reach  /story      Demo + marketing pages
/terms  /privacy           Legal
```

---

### 9. Engineering Decisions Log

| Decision | Why |
|---|---|
| Two Supabase instances | Clubs/events DB was set up separately early on — splitting kept external data isolated |
| `dataClient` uses hardcoded anon JWT | The `sb_publishable_` key blocks writes at the API gateway; anon JWT is required |
| No pgcrypto in SQL | Not available on main Supabase project; tokens generated in browser via `crypto.getRandomValues` |
| Claude Haiku for AI screening | Switched from Gemini — more reliable, supports PDF docs natively |
| `(supabase as any)` type casts | Several tables (club_officers, people, deliberation_votes, etc.) aren't in the generated types — casting avoids type errors without regenerating |
| clubId always `.trim().toLowerCase()` | Raw equality checks fail silently due to casing/whitespace inconsistencies in club records |
| No pgcrypto for invite tokens | Tokens generated on frontend; stored as plain text in club_invites |

---

### 10. Code Review Guidelines
- Build check required: `npx vite build` must pass before any PR merges
- Never use `tsc --noEmit` — it hangs on this project
- Always `.trim().toLowerCase()` clubId strings before comparing
- All user-facing errors use `toast.error()` (sonner) — no silent failures
- Use `(supabase as any)` for tables not in generated types
- Edge functions: do NOT import `supabase-js` via esm.sh — causes EarlyDrop at startup
- Email confirmation is ON — `signUp` returns `session: null`, always handle this state
- Background color is always `#0A0A0A` / `bg-zinc-950` — never white backgrounds

---

### 11. Feature Roadmap (Database)
Notion database with these fields:
| Field | Type |
|---|---|
| Feature Name | Title |
| Status | Select: Backlog / In Progress / In Review / Done |
| Priority | Select: P0 / P1 / P2 |
| Assignee | Person |
| Sprint | Select: Sprint 1, 2, 3… |
| Area | Select: Student / Club Admin / Platform / Infrastructure |
| Notes | Text |

---

### 12. Bug Tracker (Database)
| Field | Type |
|---|---|
| Bug Title | Title |
| Severity | Select: Critical / High / Low |
| Status | Select: Open / In Progress / Fixed |
| Reported By | Person |
| Route / Page | Text |
| Steps to Reproduce | Text |
| Fix Notes | Text |

---

## 📣 Marketing & Growth

### 1. Brand Guidelines
- Logo usage (light/dark variants)
- Color palette: `#0A0A0A` bg, `hsl(43 74% 56%)` gold accent, zinc-100/400/500 text
- Font: Inter (body), display font for headings
- Voice: friendly, campus-native, not corporate
- Do/Don't examples for copy

### 2. Content Calendar (Database)
| Field | Type |
|---|---|
| Post Title / Idea | Title |
| Platform | Select: Instagram / LinkedIn / TikTok / Email |
| Status | Select: Idea / Drafting / Scheduled / Posted |
| Publish Date | Date |
| Assignee | Person |
| Link / Asset | URL |
| Notes | Text |

### 3. Growth Metrics Dashboard
Link to weekly KPI doc + embed a table updated weekly:
- Weekly signups (students / clubs)
- Active users (7-day)
- Applications submitted
- Club recruitment pipelines active
- Referral sources

### 4. Campaign Briefs
One sub-page per campaign. Each brief should include:
- Goal (what success looks like)
- Target audience (UCSD students? Club officers?)
- Channels
- Timeline
- Assets needed
- Results / recap after

**Starter campaigns to document:**
- SIC Tabling Event (flyer + QR already made)
- Club officer outreach (email sequence)
- UCSD Reddit / Discord launch post

### 5. User Research & Feedback
- Interview notes (one sub-page per session)
- Key pain points discovered
- Feature requests from real users
- NPS or survey results
- Quotes worth saving for pitch decks

### 6. Email Templates
- Welcome email (new student signup)
- Club application received
- Application stage advance
- Accepted / Rejected decision
- Club officer invite
- New club request received/approved

---

## 🏢 Operations & Founding Team

### 1. Company Roadmap
High-level, quarter-by-quarter:
- Q2 2026: Launch at UCSD, onboard first 10 clubs
- Q3 2026: Expand to second UC campus
- Q4 2026: Revenue (premium club tiers)
- Long-term: Multi-university network

### 2. OKRs (Objectives & Key Results)
One table per quarter. Example structure:
| Objective | Key Result | Owner | Status |
|---|---|---|---|
| Get clubs using recruitment pipeline | 10 clubs with active pipeline | Jaden | In Progress |
| Build engaged student base | 500 student signups | Marketing | Backlog |

### 3. Meeting Notes
Sub-pages per meeting, titled: `YYYY-MM-DD — [Meeting Type]`
- Weekly team sync
- Investor / advisor conversations
- Partnership calls
- Retrospectives

Template for each note:
```
Date:
Attendees:
Agenda:
Decisions Made:
Action Items (owner + deadline):
```

### 4. Legal & Agreements
- NDA template
- CTO agreement
- Intern agreements (Elle Ma, etc.)
- Future: terms of service, privacy policy drafts

### 5. Partner & Club Directory (Database)
| Field | Type |
|---|---|
| Club / Org Name | Title |
| Contact Name | Text |
| Email | Email |
| Status | Select: Outreach / Active / Churned |
| Club Type | Text |
| Signed Up | Date |
| Notes | Text |

### 6. Investor & Advisor Tracker (Database)
| Field | Type |
|---|---|
| Name | Title |
| Type | Select: Investor / Advisor / Mentor |
| Status | Select: Cold / Warm / In Talks / Passed / Committed |
| Last Contact | Date |
| Next Step | Text |
| Notes | Text |

---

## 🎥 Demo Videos & Pitch Assets

### 1. Product Demo Videos
Table of all recorded demos:
| Video Title | Date Recorded | Link | Notes |
|---|---|---|---|
| Student onboarding flow | | | |
| Club recruitment pipeline | | | |
| Admin panel walkthrough | | | |

### 2. Pitch Deck
- Embed or link current deck (Figma / Google Slides)
- Version history (V1, V2…) with dates
- Notes on what changed between versions

### 3. Screenshots & Assets
- App screenshots for press/pitch (organized by feature)
- Club logos for partner slides
- Team photos

---

## 📋 How to Set This Up in Notion

1. Create a new Notion workspace: `unicircle.app` (or similar)
2. Invite your team (Settings → Members)
3. Create a page called **Home** — this is your sidebar anchor
4. Under Home, create one top-level page per section above
5. For anything labeled **(Database)**, use Notion's `/database` → Table view
6. Pin the most-used databases to the sidebar for quick access
7. Set Home as the **Default page** so everyone lands there on open

**Suggested sidebar order:**
```
🏠 Home
⚙️ Engineering
📣 Marketing
🏢 Operations
🎥 Demos & Pitch
```
