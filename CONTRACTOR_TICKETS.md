# UniCircle Connect — Contractor Scope (Sprint 1)

**Project:** UniCircle Connect  
**Repo:** jadenrones2-blip/unicircle-connect  
**Stack:** React + TypeScript + Vite, Tailwind, Supabase  
**Build check:** always run `npx vite build` before marking done — never `tsc --noEmit` (it hangs)  
**Deploy:** push to `main` → Vercel auto-deploys  

---

## UC-01 | Kanban "Applied" Intake Column — Visual Fix

**Type:** Bug  
**Priority:** High  
**Estimate:** 2–3h  
**Story Points:** 2  

### Background
When a club sets up their recruitment pipeline, the first stage is auto-created with `is_intake: true` in the `recruitment_stages` table. This is meant to be the "Applied" holding column where new applicants land. The flag is written to the DB but never read back — so the Applied column looks and behaves identically to every other stage. Officers can't distinguish it at a glance.

### Root Cause
- `fetchStages()` in `src/hooks/useRecruitment.ts` does not SELECT `is_intake`
- `is_intake` is never passed to `src/components/recruitment/StageColumn.tsx`
- No conditional styling exists in the component

### Files to Touch
- `src/hooks/useRecruitment.ts` — add `is_intake` to SELECT in `fetchStages()`
- `src/components/recruitment/RecruitmentKanban.tsx` — pass `isIntake` prop to StageColumn
- `src/components/recruitment/StageColumn.tsx` — add conditional styling when `isIntake === true`

### Acceptance Criteria
- [ ] `is_intake` is included in the `fetchStages()` SELECT query
- [ ] `isIntake` boolean prop is passed from `RecruitmentKanban.tsx` → `StageColumn.tsx`
- [ ] The Applied column has a visually distinct header (e.g. blue left border, "Applied" label, or badge) compared to other stages
- [ ] All other stages are unaffected
- [ ] Build passes: `npx vite build` exits clean

---

## UC-02 | Bulk Stage Move — Recruitment Kanban

**Type:** Feature / Bug  
**Priority:** High  
**Estimate:** 4–6h  
**Story Points:** 5  

### Background
Officers need to move multiple applicants at once (e.g. after a screening round, advance 20 people to interviews). Currently the only "bulk" action is `handleAdvanceRound()` which only moves applicants already marked `final_decision = accepted` — not a generic multi-select tool. `OrgPeopleDashboard` already has a working bulk-move implementation that can be used as a reference.

### Reference Implementation
`src/pages/OrgPeopleDashboard.tsx` lines 177–191 — has checkboxes, stage selector dropdown, and batch update. Port this pattern to the kanban.

### Files to Touch
- `src/components/recruitment/ApplicantCard.tsx` — add checkbox UI
- `src/components/recruitment/RecruitmentKanban.tsx` — selection state, bulk move toolbar, batch UPDATE call
- `src/hooks/useRecruitment.ts` — add `bulkMoveApplicants(ids[], stageId)` function if needed

### Acceptance Criteria
- [ ] Applicant cards in the kanban have a checkbox (visible on hover or always visible)
- [ ] Selecting one or more cards reveals a toolbar: "Move X applicants to..." with a stage dropdown
- [ ] Selecting a stage runs a single batch UPDATE on `applicants` table (not N individual calls)
- [ ] After move, kanban re-fetches and cards appear in the correct column
- [ ] Deselect all / cancel clears the selection state
- [ ] Works for owners and officers equally
- [ ] Build passes: `npx vite build` exits clean

---

## UC-03 | Notifications System — Data Pipeline

**Type:** Bug / Feature  
**Priority:** Critical  
**Estimate:** 8–12h  
**Story Points:** 8  

### Background
The notification bell in the header, the `useNotifications` hook, and the `notifications` table all exist and the UI looks complete. The bell always shows "No notifications yet" because nothing ever inserts rows into the `notifications` table. The entire system is wired up on the read side with no write side.

### Events That Should Trigger a Notification

| Event | Who gets notified | Message |
|-------|------------------|---------|
| Student submits application | Club officers + owner | "{Name} applied to {Club}" |
| Officer invited to club | Invited officer | "You've been invited to join {Club} as an officer" |
| Applicant advances to new stage | Applicant (student) | "Your application to {Club} moved to {Stage}" |
| Final decision: accepted | Applicant (student) | "You've been accepted to {Club}" |
| Final decision: rejected | Applicant (student) | "Your application to {Club} has been reviewed" |

### Technical Notes
- `notifications` table is on the main Supabase instance (`xvaoxmqmnmhbnpwobpmm`)
- Existing edge functions (`notify-applicant-stage`) handle email — notification inserts are separate and must never block those flows
- Use `(supabase as any)` for the insert since `notifications` may not be in generated types
- Add real-time subscription to `src/hooks/useNotifications.ts` so bell count updates without page refresh
- Notification inserts must be fire-and-forget — wrap in try/catch, never throw

### Files to Touch
- `src/pages/ClubApply.tsx` — insert notification after successful application submit
- `src/hooks/useRecruitment.ts` — insert notification in `updateApplicantStage()` and `updateFinalDecision()`
- `src/pages/AcceptInvite.tsx` — insert notification after officer successfully claims invite
- `src/hooks/useNotifications.ts` — add Supabase real-time subscription for live bell updates

### Acceptance Criteria
- [ ] Submitting an application inserts a notification row for each officer/owner of that club
- [ ] Accepting a club invite inserts a notification for the invited officer
- [ ] Moving an applicant to a new stage inserts a notification for the applicant's user account (if they have one)
- [ ] Setting a final decision (accepted/rejected) inserts a notification for the applicant
- [ ] Bell badge count increments in real time without page refresh
- [ ] Marking notifications as read works (already implemented in hook — just verify it still works)
- [ ] Notification inserts fail silently and never block or crash the primary action
- [ ] Build passes: `npx vite build` exits clean

---

## UC-04 | Club Matching — Incorporate Student Major

**Type:** Improvement  
**Priority:** Medium  
**Estimate:** 3–4h  
**Story Points:** 3  

### Background
`calculateMatchScore()` in `src/lib/clubRecommendations.ts` scores clubs against a student's saved interest keywords. It completely ignores the student's declared major. A CS student with no saved interests gets 0% match on every tech club. Major is stored in the student profile but never passed into the matching logic.

### Files to Touch
- `src/lib/clubRecommendations.ts` — update `calculateMatchScore()` signature and logic
- Any call sites that invoke `calculateMatchScore()` — update to pass student major

### Acceptance Criteria
- [ ] `calculateMatchScore()` accepts an optional `studentMajor?: string` parameter
- [ ] A mapping of common UCSD major names → interest clusters is added (cover at minimum: Computer Science, Biology, Economics, Political Science, Psychology, Mechanical Engineering, Electrical Engineering, Business, Communications, Chemistry)
- [ ] When major maps to a cluster, those keywords contribute to match scoring at 0.5× weight (explicit interests stay at 1× so they dominate)
- [ ] All call sites that invoke `calculateMatchScore()` are updated to pass the student's major
- [ ] A student with no saved interests but a declared major sees non-zero match scores on relevant clubs
- [ ] Existing behavior for students without a declared major is unchanged
- [ ] Build passes: `npx vite build` exits clean

---

## UC-05 | Apply Page — Silent Upload Failure Feedback

**Type:** Bug / UX  
**Priority:** Low  
**Estimate:** 1–2h  
**Story Points:** 1  

### Background
On `src/pages/ClubApply.tsx`, resume and video uploads are intentionally non-blocking — if they fail, the application still submits successfully. This is correct for reliability but means a student can believe their resume was received when it wasn't. There is no post-submission feedback indicating whether uploads succeeded or failed.

### Files to Touch
- `src/pages/ClubApply.tsx` — track upload success/failure, show warning toast if either fails

### Acceptance Criteria
- [ ] After submission, if resume upload failed, a toast warning appears: "Your application was submitted but your resume failed to upload. Contact the club directly."
- [ ] Same pattern for video answer upload failure
- [ ] The success redirect still happens — warnings are additive, not blocking
- [ ] No change to the happy path when both uploads succeed
- [ ] Build passes: `npx vite build` exits clean

---

## Total Scope Summary

| Ticket | Priority | Estimate | Points |
|--------|----------|----------|--------|
| UC-01 Intake column fix | High | 2–3h | 2 |
| UC-02 Bulk stage move | High | 4–6h | 5 |
| UC-03 Notifications pipeline | Critical | 8–12h | 8 |
| UC-04 Major matching | Medium | 3–4h | 3 |
| UC-05 Upload failure feedback | Low | 1–2h | 1 |
| **Total** | | **18–27h** | **19** |

---

## Dev Environment Setup

```bash
git clone https://github.com/jadenrones2-blip/unicircle-connect
cd unicircle-connect
npm install
# add .env with Supabase keys (get from Jaden)
npm run dev
```

**Before marking any ticket done:**
```bash
npx vite build
```
Must exit with no errors. Do not use `tsc --noEmit` — it hangs.
