# UniCircle — Club Operations Features PRD
**Version**: 0.1 — Draft for review
**Date**: March 18, 2026
**Status**: Pre-implementation outline

---

## Background

Two product discovery sessions were conducted with club leaders at UCSD:

1. **WIB (Women in Business)** — large professional org, ~100+ members, heavy dues and attendance requirements
2. **Theta / Kalyssa** — Greek life org, competitive recruitment with deliberation rounds

Both sessions surfaced the same root problem: **club admin work is almost entirely manual, spreadsheet-based, and fragile.** The highest-pain workflows are financial tracking, attendance, and recruitment deliberations.

---

## Discovery Themes

### WIB Pain Points
- Dues collected via Zelle + Google Form → officer manually cross-references both (~2 hrs/day during collection windows)
- Dues tiers: $225 (general) + $100 (add-on) — multiple amounts create ambiguity
- Absence tracking uses a custom form; officers read every excuse manually, no automation
- After dues confirmation, onboarding is entirely manual (no automated unlock of resources)
- Historical spreadsheets are dirty and hard to migrate
- Officers worried about sharing member financial data on a new platform

### Theta/Kalyssa Pain Points
- Rush cycle: 3 open rush nights → invite-only events → interviews → deliberations
- Time cost: 15 hrs of events + 8 hrs/week planning during rush; 20 hrs during rush week
- Most time-consuming step: **deliberations** (in-person, ad-hoc, no structure) and **communication** (chasing applicants)
- Workload deters regular members from serving as officers
- Trust blockers: access control (who sees what), data accuracy, platform reliability
- Leaders believe this problem exists at every campus — potential for horizontal expansion

---

## Feature Scope (this sprint)

### Priority Matrix

| Feature | Pain Severity | Time Saved | Ease of Build | Priority |
|---|---|---|---|---|
| Dues Tracker | 🔴 Critical | ~2 hrs/day | Medium | **P0** |
| Application Deliberation | 🔴 Critical | ~20 hrs/rush | Medium | **P0** |
| Absence Manager | 🟠 High | ~1 hr/week | Low | **P1** |
| Points Ledger | 🟡 Medium | ~30 min/week | Low | **P2** |

---

## Feature 1: Dues Tracker

### Problem
Officers receive Zelle payments with freeform memo fields and must manually match each to a Google Form submission. One officer described spending 2 hrs/day during active collection windows.

### Goal
Give officers a centralized view of who has paid, who hasn't, and how much — without requiring manual matching.

### User Stories

**As an officer:**
- I can see a table of all members with their dues status (Paid / Pending / Waived)
- I can manually mark a member as paid (with amount and date)
- I can bulk import member names/PIDs from a CSV (to seed the list without re-entering)
- I can filter by payment status to quickly see who still owes
- I can add notes per member (e.g., "payment plan agreed")
- I can see a summary: total collected vs. expected (based on dues amount × member count)
- I can configure dues tiers (e.g., General: $225, Add-on: $100)

**As a member:**
- I can see my own dues status from my dashboard (Paid / Pending / Amount owed)

### Data Model (proposed)

```sql
dues_tiers (id, club_id, label, amount, required)
dues_records (id, club_id, member_id, tier_id, status, amount_paid, paid_at, notes)
```

### Out of Scope (v1)
- Automatic Zelle/Venmo reconciliation (requires payment API integration — too complex)
- Email reminders (can add in v2)
- Online payment collection through the platform

### Privacy Notes
- Dues data is only visible to officers of that club
- Members see only their own status, not others'
- No payment method details stored (just amount + status)

---

## Feature 2: Application Deliberation

### Problem
During rush week, Theta and similar orgs review 50-100+ applicants in live deliberation sessions. Currently this is done verbally in a room with no structured record — leading to:
- Long sessions (3-4 hours)
- Decisions influenced by loudest voices
- No audit trail for appeals
- Officers can't prepare beforehand

### Goal
Give each officer/voter a private ballot per applicant. Surface aggregated results to decision-makers. Replace the unstructured deliberation session with an async-first process.

### User Stories

**As a recruitment officer:**
- I can create a recruitment cycle (e.g., "Spring 2026 Rush") with a list of applicants
- I can import applicants from a CSV (name, email, major, year, optional notes)
- I can assign which club members are eligible to vote
- I can open/close voting for a specific applicant or the entire cycle
- I can see the tally for each applicant: # of Yes / No / Maybe votes + written notes
- I can see which voters haven't submitted a vote yet
- I can mark an applicant as Accepted / Waitlisted / Rejected (final decision, separate from votes)
- I can export results to CSV for club records

**As a voting member:**
- I can see the list of applicants I'm eligible to vote on
- I can submit a vote: Yes / No / Maybe + optional written comment
- I can change my vote until voting closes
- I cannot see other members' votes until the cycle closes (prevents anchoring bias)

### Data Model (proposed)

```sql
recruitment_cycles (id, club_id, name, season, year, status)
applicants (id, cycle_id, name, email, major, year, notes, final_decision)
deliberation_votes (id, applicant_id, voter_id, vote, comment, created_at)
```

`vote` enum: `yes | no | maybe`
`final_decision` enum: `pending | accepted | waitlisted | rejected`

### Vote Visibility Rules
- Votes are hidden from all voters while voting is open
- After voting closes (officer action), aggregate tallies are visible to all voters
- Individual votes are visible only to officers (never to other voters)

### Out of Scope (v1)
- Automated applicant communication (accept/reject emails)
- Two-round voting (interview invite round)
- Commenting threads between voters

---

## Feature 3: Absence Manager

### Problem
WIB requires members to submit excuses for missed events. Officers read every excuse manually, checking against strict criteria (specific keywords/reasons that qualify). No automation exists.

### Goal
Give members a structured form to submit absences. Give officers a filtered inbox where valid excuses are pre-flagged so they only need to review edge cases.

### User Stories

**As a member:**
- I can submit an absence excuse for a specific event (dropdown of upcoming/past events)
- I fill in: reason category (Academic / Health / Work / Family / Other), description, any supporting context
- I receive confirmation that my excuse was submitted

**As an officer:**
- I can see all submitted excuses for each event
- Excuses are pre-labeled: Likely Valid / Needs Review / Likely Invalid (based on keyword rules)
- I can Approve or Deny each excuse with one click
- I can add a note when denying (returned to member)
- I can configure which reason categories auto-qualify vs. require review
- I can see per-member absence history and approval rate

### Keyword/Category Rules (configurable)
WIB example rules:
- Academic (midterm, final, lab) → Likely Valid
- Health (illness, medical, emergency) → Likely Valid
- Work (job interview, shift conflict) → Needs Review
- Family (emergency) → Needs Review
- Other → Needs Review

### Data Model (proposed)

```sql
absence_requests (id, club_id, member_id, event_id, category, description, status, officer_note, created_at)
```

`status` enum: `pending | approved | denied`

### Out of Scope (v1)
- Absence point deduction automation (inform but don't auto-apply)
- Appeals process

---

## Feature 4: Points Ledger

### Problem
Some clubs track participation points (event attendance, volunteering, etc.) to determine active membership status. This is typically done in a spreadsheet per term.

### Goal
Give officers a ledger to award/deduct points per member per action. Give members visibility into their own standing.

### User Stories

**As an officer:**
- I can see a table of all members with their current point totals
- I can add a point entry: member, points (positive or negative), reason, date
- I can bulk-award points to everyone who attended an event
- I can set a minimum point threshold for "active member" status
- I can export the ledger to CSV

**As a member:**
- I can see my own point history and current total
- I can see how my points compare to the active member threshold

### Data Model (proposed)

```sql
point_entries (id, club_id, member_id, points, reason, event_id, awarded_by, created_at)
point_thresholds (id, club_id, label, minimum_points, term)
```

### Out of Scope (v1)
- Automated point award on RSVP/check-in (requires event check-in system)
- Point expiration/term rollover

---

## Shared Requirements

### Access Control
All four features share the same access model:
- **Officers** (club admin role) — full read/write
- **Members** — read own data only; write only where explicitly noted (absences, viewing dues status)
- **Non-members** — no access

### Data Security
- Officers raised trust concerns explicitly (Theta/Kalyssa session)
- All club ops data must be scoped to `club_id` with officer-level row checks
- No member financial or vote data is ever exposed to other members
- We will enforce this at the application layer (current pattern), with a plan to add RLS when auth is unified

### Design Patterns (consistent with existing app)
- Dark theme: `bg-[#0A0A0A]`, gold accent `hsl(43 74% 56%)`
- Club admin features live under `/club-admin/clubs/:clubId/...`
- Sidebar nav already has slots for new links (Analytics pattern)
- Use `dataClient` (external DB) for all ops data
- Toast notifications via `sonner` for all success/error states
- CSV import via `<input type="file" accept=".csv" />`

---

## Implementation Order

```
Phase 1 (highest pain):
  └── Dues Tracker
  └── Application Deliberation

Phase 2:
  └── Absence Manager

Phase 3:
  └── Points Ledger
```

---

## Open Questions (resolve before building)

1. **Member roster**: How do officers add members to a club? Right now there's no "member list" in the system. Do we need a Members table first, or can we seed from CSV per feature?
2. **Dues payment confirmation**: WIB wants automatic matching. Is there any appetite to integrate with Zelle/Venmo webhooks, or is manual-mark acceptable for v1?
3. **Deliberation visibility**: Should voting members see the applicant's submitted application materials (essay, resume), or just name/major/year?
4. **Points + Attendance link**: Should points auto-update when RSVP/check-in data is available, or stay manual for now?
5. **Multi-cycle recruitment**: Does Theta run multiple recruitment cycles per year? Should cycles be copyable?

---

*Document owner: Jaden Rones | Next step: resolve open questions, then begin Phase 1 implementation*
