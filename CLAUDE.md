# UniCircle Connect — Claude Code Context

## Project Overview
UniCircle Connect is a club discovery and recruitment platform for UCSD students.
- **Students** browse clubs, RSVP to events, apply to clubs, track application status
- **Club admins/officers** manage a recruitment pipeline (kanban), score applicants, send automated emails
- **Platform admins** approve club requests, manage events

Deployed at: **unicircle.app** via Vercel (auto-deploy on push to `main`)
GitHub repo: jadenrones2-blip/unicircle-connect

---

## Stack
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix primitives)
- framer-motion for animations
- lucide-react for icons
- react-router-dom v6 (BrowserRouter in `src/App.tsx`)
- supabase-js for auth + DB
- sonner for toasts
- @dnd-kit for drag-and-drop kanban
- PapaParse for CSV import
- react-helmet-async for SEO

---

## Two Supabase Instances

| Instance | Project ID | Used for |
|----------|-----------|---------|
| Main (auth DB) | `xvaoxmqmnmhbnpwobpmm` | auth, profiles, applicants, recruitment pipeline, notifications, edge functions |
| External (clubs DB) | `tayhvgmterjzolvodwow` | clubs, events (read via `dataClient`) |

- `src/integrations/supabase/client.ts` — main client
- `src/integrations/supabase/dataClient.ts` — external clubs client
- The `dataClient` key must be the anon JWT, not the `sb_publishable_` key (that blocks writes)

---

## Key Files
- `src/App.tsx` — all routes
- `src/hooks/useRecruitment.ts` — full recruitment state (stages, applicants, CRUD, realtime)
- `src/hooks/useRecruitmentRequirements.ts` — rubric criteria from `recruitment_requirements` table
- `src/hooks/useRubricScoring.ts` — per-officer scores, `calcWeightedScore`, `teamAvgForCriterion`
- `src/hooks/useClubOwnership.ts` — `isOwnerOf()`, `isOfficerOf()`, `ownedClubs`
- `src/hooks/useAuth.ts` — current user
- `src/components/recruitment/RecruitmentKanban.tsx` — main pipeline UI
- `src/components/recruitment/ApplicantDetailDrawer.tsx` — slide-in applicant review panel
- `src/components/recruitment/StageColumn.tsx` — individual kanban column
- `src/components/recruitment/ApplicantCard.tsx` — draggable applicant card
- `src/pages/ClubAdminRecruitment.tsx` — recruitment page (owner + officer access)
- `src/pages/OrgPeopleDashboard.tsx` — people/roster tab (reads from `people` table)
- `src/pages/ClubAdminAnalytics.tsx` — analytics (reads from `applicants` + `people`)
- `src/pages/AcceptInvite.tsx` — officer invite acceptance flow
- `src/pages/AuthCallback.tsx` — post-OAuth redirect handler
- `src/pages/ClubApply.tsx` — public student application page (no auth required)

---

## Key DB Tables (Main Supabase)
- `applicants` — recruitment kanban data, has realtime enabled
- `recruitment_stages` — pipeline stages per club (has `is_intake` boolean)
- `recruitment_requirements` — rubric criteria (type: `'strict'` | `'ai'`)
- `officer_rubric_scores` — per-officer, per-criterion scores (unique on applicant+officer+requirement)
- `deliberation_votes` — Yes/No/Maybe votes per officer per applicant
- `application_forms` — custom form questions per club (jsonb)
- `recruitment_settings` — enabled/disabled + visibility settings per club
- `club_owners` — maps user_id to club_id for owners
- `club_officers` — maps invited officers to clubs (club_id is text)
- `club_invites` — one-time invite tokens (token generated on frontend, NOT pgcrypto)
- `people` — OrgPeopleDashboard roster (separate from `applicants`)
- `notifications` — in-app notification bell
- `new_club_requests` — public club onboarding requests

---

## Design Conventions
- **Background**: `#0A0A0A` or `bg-zinc-950`
- **Text**: `text-zinc-100` (primary), `text-zinc-400` (secondary), `text-zinc-500` (muted)
- **Borders**: `border-white/10`
- **Gold accent**: `text-gold`, `bg-gold/10`, `border-gold/20` — CSS var `hsl(43 74% 56%)`
- **Font**: `font-display` for headings
- **Errors**: always use `toast.error()` from sonner — never silent failures shown to users
- **Cards**: `bg-zinc-900 border-white/10` with `hover:bg-zinc-800`
- Dark mode is set via `class="dark"` on the `<html>` element

---

## Development Rules
1. **Build check**: always run `npx vite build` to verify before saying something is done. Never use `tsc --noEmit` — it hangs.
2. **Deploy**: push to `main` → Vercel auto-deploys. No manual step needed.
3. **SQL migrations**: files in `supabase/migrations/` are documentation only — they must be run manually in the Supabase dashboard SQL editor at supabase.com/dashboard/project/xvaoxmqmnmhbnpwobpmm.
4. **pgcrypto**: NOT available in the main project. Never use `gen_random_bytes()` or `encode(..., 'base64url')` in SQL. Generate tokens on the frontend with `crypto.getRandomValues`.
5. **Type casting**: Supabase client needs `(supabase as any)` for tables not in the generated types (club_officers, club_invites, people, officer_rubric_scores, deliberation_votes, application_forms).
6. **clubId normalization**: always `.trim().toLowerCase()` before comparing clubId strings — raw equality checks fail silently.
7. **Edge functions**: deployed to Supabase, written in Deno. Do not import `supabase-js` via esm.sh in edge functions — it causes EarlyDrop at startup. Use lightweight Bearer token validation instead.
8. **Email confirmation**: Supabase Auth has email confirmation ON — `signUp` returns `session: null`. Always handle this state.

---

## Routing Structure (key routes)
```
/                          — landing
/login                     — auth
/auth/callback             — OAuth callback (checks officer/owner/student)
/invite/:token             — officer invite acceptance
/onboarding                — student interest setup
/dashboard                 — student home
/clubs                     — directory
/clubs/:id                 — club detail
/clubs/:id/apply           — PUBLIC student apply page (no auth guard)
/club-admin                — owner home
/club-admin/clubs/:id/*    — owner/officer dashboard tabs
/admin/*                   — platform admin
```

---

## Automated Emails (Edge Function: notify-applicant-stage)
Triggered for:
- `application_received` — on student submit (from ClubApply.tsx)
- `stage_advance` — on applicant moved to new stage (from updateApplicantStage)
- `final_decision` — on accepted/rejected decision (from updateFinalDecision)

---

## Known Architecture Notes
- Realtime is enabled on `applicants` table — useRecruitment subscribes to INSERT/UPDATE
- `OrgPeopleDashboard` reads from `people` table; `ClubAdminAnalytics` reads from `applicants` — analytics falls back to `people` count when kanban is empty
- `officerScoreMap` in RecruitmentKanban fetches all officer scores in one query and passes weighted totals to each ApplicantCard as a badge
- Storage buckets: `club-images` (public), `resumes` (private), `application-videos` (private), `avatars` (public)
