# UniCircle Connect — Product Requirements Document

**Version**: 1.0
**Last updated**: February 22, 2026
**Status**: Live (Beta) — UC San Diego

---

## 1. Product Overview

UniCircle Connect is a recruitment infrastructure platform for student organizations at UC San Diego. It provides structured tools for club discovery, applicant pipeline management, and transparent recruitment tracking.

### Mission

Replace fragmented spreadsheet-and-DM workflows with a centralized system where student organizations manage recruitment at scale and applicants track their progress transparently.

### Target Users

| Role | Description |
|------|-------------|
| **Student** | UCSD students discovering clubs, applying, and tracking recruitment status |
| **Club Owner** | Leaders of student organizations managing profiles, events, and recruitment pipelines |
| **Platform Admin** | UniCircle team members reviewing scraped events, managing claims, and overseeing the catalog |

### Business Model

Free for all users (both organizations and students). No premium tiers currently defined.

### Legal Position

UniCircle Connect is not affiliated with, endorsed by, or sponsored by the University of California, San Diego. `.edu` emails are used solely for student status verification.

---

## 2. User Personas

### Alex — The Club-Curious Student
- Freshman exploring campus involvement
- Wants to find clubs matching their interests without attending dozens of info sessions
- Frustrated by scattered recruitment timelines and no visibility into application status
- **Goal**: Discover aligned clubs, apply, and know where they stand

### Maya — The Club President
- Runs a professional org receiving 200+ applications per cycle
- Currently uses Google Forms → Sheets → email chains
- Loses track of applicants, sends inconsistent updates, spends hours coordinating reviewers
- **Goal**: Structured pipeline to evaluate, advance, and communicate with applicants efficiently

### Jordan — The Multi-Club Applicant
- Applying to 5+ clubs simultaneously
- Gets ghosted by most — no idea if they're still being considered
- **Goal**: A single dashboard showing real-time status across all applications

---

## 3. Feature Requirements

### 3.1 Landing Page & Waitlist

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Value proposition sections | Problem (6 pain points), Solution (6 capabilities with pipeline preview), How It Works (3-step flow) |
| Dual CTA | "Claim your club" (→ directory) and "Create a student account" (→ signup) |
| FAQ accordion | 6 questions covering what/who/how/pricing |
| Waitlist form | Email capture → Supabase `waitlist` table → confirmation email via `notify-waitlist-signup` |
| Non-affiliation disclaimer | Prominently displayed in hero and footer |

### 3.2 Authentication

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Email/password auth | Supabase Auth, no social login |
| Role-based signup | Tab toggle: Student vs Club Owner. Different post-signup routing |
| Student email gating | Login in student mode requires `@ucsd.edu` email |
| Club owner login | Any email. Post-login checks `club_owners` table for owned clubs |
| Admin login | Hidden mode via `?role=admin` URL param. Validates `has_role` RPC |
| Post-login routing | Admin → `/admin/events`, Club owner with clubs → `/club-admin`, Student → `/dashboard` or `/onboarding` |
| Password reset | Rate-limited, single-use reset links, redirect to `/reset-password` |
| Deep link support | `?redirect=` query param preserved through login |

### 3.3 Student Onboarding

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| 5-step interest quiz | Superpower, Career goals, Interests, Energy level, Vibe — multi/single-select cards with emoji |
| Resume upload (optional) | PDF or .txt, max 5MB, client-side PDF extraction via `pdfjs-dist` |
| AI keyword extraction | `extract-resume-keywords` edge function (Gemini) returns 4 categories: career_goals, interests, skills, vibe |
| Privacy | Resume processed in-memory, not stored. Explicit notice shown |
| Progress bar | Fixed top bar fills 0–100% across 6 steps |
| Skip option | Resume step can be skipped entirely |
| Re-take | "Retake Quiz" available from dashboard at any time |
| Data storage | `user_interests` table: `{ user_id, interest_category, interest_value }` |

### 3.4 Student Dashboard

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Recruitment tracker | Shows active pipeline applications with stage progress bar and percentage. Hidden when empty |
| My Clubs tab | List of current memberships with leave action |
| Applications tab | All applications with status badges (Pending/Accepted/Not Selected/Withdrawn), withdraw action for pending |
| Saved Clubs tab | Saved clubs grid + "Similar Clubs You Might Like" recommendations (up to 9) |
| Recommendations section | Up to 12 clubs scored by keyword-clustering algorithm against quiz answers. Match score indicator per card. "Apply" button per card |
| Refresh & retake | Refresh button re-fetches clubs; Retake Quiz returns to `/onboarding` |

### 3.5 Club Discovery & Directory

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Searchable directory | Text search across club name + description. NFD-normalized, diacritic-stripped |
| Category filter | 12 categories: Academic, Cultural, Fraternity, Greek Life, Professional, Service, Social, Sorority, Spiritual, Sports, Tech/STEM |
| View modes | List view (compact rows) and Grid view (cards with save button) |
| Result count | "Showing N clubs [in Category] [matching 'query']" |
| Save/unsave | Heart toggle per club. Requires login (toast prompt if not) |
| Club claiming guide | Dismissable banner with 3-step instructions |
| Request new club | Modal form for clubs not yet in directory |

### 3.6 Club Detail Page

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Hero image | Full-width cover with gradient overlay and floating info card |
| Club info | Name, recruiting status badge (Open/Upcoming, hidden if Closed), category, description, tags |
| Contact row | Email (mailto), Instagram, Website links — shown if available |
| Actions | Express Interest (mailto), Save/Unsave, Share, Claim this club (non-owners), Manage Club (owners) |
| About tab | "What We Do" description + "How to Join" 3-step guide |
| Events tab | Club-specific events from external DB with count in tab label |

### 3.7 Club Recommendations Engine

**Priority**: P1 (shipped)

| Requirement | Details |
|-------------|---------|
| Algorithm | Client-side keyword-clustering (no ML model, no server call) |
| Input signals | User's saved clubs + onboarding quiz answers + resume keywords |
| Keyword clusters | ~30 static domain clusters mapping terms to categories |
| Scoring | Tokenize club name/description/tags → match against clusters → intersection score with user profile |
| Output | Sorted list of top-N recommended clubs with match scores |
| Event recommendations | Same interest-keyword mapping reused in `useEventRecommendations` for calendar |

### 3.8 Events Calendar

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Calendar views | Monthly calendar + list view (FullCalendar) |
| Data source | External DB via `useExternalEvents` hook, verified events only |
| Real-time updates | 30-second polling interval |
| Recommended events | Top 4 events scored against user interests (logged-in users only). Shows matched interest tags |
| Event detail modal | Title, club, date/time, location, description |
| Submit event CTA | Shown to club owners, links to `/submit-event` |

### 3.9 Club Ownership & Verification

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Claim flow | Find club in directory → "Claim this club" → email + proof link → verification email sent |
| Email verification | SHA-256 hashed token, 10-minute expiry, single-use |
| Trust tiers | **Verified** (institutional domain) — full access. **Provisional** (non-.edu) — restricted: events as drafts only, no mass messages, external links need review |
| Abuse prevention | Rate limiting (per email+club), disposable domain blocking, lookalike club name detection |
| Verification page | `/verify-claim?token=...` — shows tier-specific capabilities and restrictions |
| Trust escalation | Provisional → Verified via `.edu` email or confirmation from another verified admin |

### 3.10 Club Admin Dashboard

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Multi-club support | Admins can own and manage multiple clubs from one account |
| Per-club cards | Club name, verification badge, claim date, action buttons (Edit, Events, New Event) |
| Provisional warning | Yellow banner listing specific restrictions |
| Onboarding checklist | Per-club setup task tracker |
| Recruitment dashboard card | Pipeline stats summary per club |
| Admin profile | Display name, role title, avatar (set during admin onboarding) |

### 3.11 Club Profile Editing

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Editable fields | Cover image, description (max 2000 chars), email, Instagram, LinkedIn, website |
| Recruiting status | Toggle between Open / Upcoming / Closed with recruitment cycle config |
| Image upload | `ClubImageUpload` component with preview |
| Save behavior | Proxied through `external-db-proxy` edge function with ownership enforcement |
| Provisional restrictions | Applied server-side via edge function |

### 3.12 Event Management (Club Admin)

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Event list | Table with title, date, location, status (Published/Pending), edit/delete actions |
| Filters | Status (All/Published/Pending), date range (start + end pickers) |
| Event creation | Full form: title, date, time, location, description, image upload, Instagram link |
| AI auto-fill from flyer | Upload event flyer image → Gemini Vision extracts fields → auto-populates form |
| Live preview | Sticky right-column preview card updates in real-time |
| Provisional behavior | Events saved as drafts (not published). Visual indicators throughout |
| Inline editing | `EventEditModal` for updating existing events |
| Delete confirmation | AlertDialog with "cannot be undone" warning |

### 3.13 Recruitment Pipeline (Club Admin)

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Enable/disable | Toggle recruitment on/off per club |
| Stage templates | 2 pre-built (Professional Org, Product/Tech Org) + custom builder (2–8 stages) |
| Kanban view | Drag-and-drop columns per stage (`@dnd-kit`). Drag overlay shows rotated card |
| Table view | Sortable, filterable table with stage column |
| Add applicant | Manual entry via dialog form |
| CSV import | `CSVDataMapper` component for bulk applicant upload. Maps CSV columns to fields |
| AI screening | `ai-screen-applicants` edge function: Gemini evaluates applicants against requirements, writes `fit_score` + `ai_summary` |
| Requirements builder | Define strict filters (auto-reject) and AI criteria (scored) per club |
| Stage advancement | Drag applicant to new stage → auto-notification email via `notify-applicant-stage` |
| Student visibility settings | Configure what applicants can see: stage names, progress bar, timeline, custom message |

### 3.14 Student Recruitment Tracking

**Priority**: P1 (shipped)

| Requirement | Details |
|-------------|---------|
| Progress visibility | Per-application card showing current stage in pipeline |
| Progress bar | Visual percentage based on stage position / total stages |
| Configurable | Club admin controls what students see (stage names, progress bar, timeline) |
| Dashboard integration | Shown as top section on student dashboard when active applications exist |

### 3.15 Platform Admin — Event Review Queue

**Priority**: P0 (shipped)

| Requirement | Details |
|-------------|---------|
| Review queue | Table of unverified scraped events with bulk selection |
| Manual scrape trigger | "Scrape Now" button invokes `scrape-events` edge function. Shows results (clubs searched, events extracted) |
| Review modal | Scraped data (readonly) + correction fields (title, start/end time, location). Approve or Reject |
| Approve behavior | Sets `verified: true`, saves corrections, triggers `notify-event-approved` email to club |
| Reject behavior | Deletes event via `admin-delete` action |
| Bulk reject | Select multiple events → "Reject Selected" |
| Deduplication | Client-side by normalized title |
| Past event filtering | Only future events shown |

### 3.16 Data Scraping Pipeline

**Priority**: P1 (shipped)

| Requirement | Details |
|-------------|---------|
| Club email scraping | `scrape-club-emails`: Firecrawl scrapes studentorg.ucsd.edu for email, website, Instagram |
| Club website scraping | `scrape-club-websites`: Firecrawl + Gemini extracts events from club websites |
| Web event scraping | `scrape-events`: Perplexity + Gemini finds UCSD campus events |
| Eventbrite scraping | `scrape-eventbrite`: Perplexity + Firecrawl + Gemini extracts Eventbrite events |
| Instagram scraping | `scrape-instagram`: Firecrawl + Gemini extracts events from club Instagram posts |
| Eventbrite sync | `sync-club-eventbrite`: Matches Eventbrite organizers to known clubs |
| Website discovery | `discover-club-websites`: Firecrawl search finds official club websites |

---

## 4. Information Architecture

### Navigation Structure

```
Public:
  Landing Page (/)
  ├── Login (/login)
  ├── Signup (/signup)
  ├── Forgot Password (/forgot-password)
  ├── Terms (/terms)
  └── Privacy (/privacy)

Student (authenticated):
  Dashboard (/dashboard)
  ├── Clubs Directory (/clubs)
  │   └── Club Detail (/clubs/:id)
  ├── Events Calendar (/events)
  ├── Express Interest (/express-interest)
  └── Onboarding (/onboarding)

Club Admin (club owner):
  Club Admin Dashboard (/club-admin)
  ├── Club Edit (/club-admin/clubs/:id/edit)
  ├── Club Events (/club-admin/clubs/:id/events)
  ├── Recruitment (/club-admin/clubs/:id/recruitment)
  ├── Submit Event (/submit-event)
  ├── Admin Profile (/club-admin/profile)
  └── Admin Onboarding (/admin-onboarding)

Platform Admin:
  Event Review Queue (/admin/events)
  Verify Claim (/verify-claim)
```

### Data Model (Key Entities)

```
User ──┬── student ──── user_interests
       │                saved_clubs
       │                club_applications
       │                club_memberships
       │
       └── club_owner ── club_owners (with trust tier)
                         └── Club (external DB)
                              ├── Events (external DB)
                              ├── recruitment_settings
                              ├── recruitment_stages
                              ├── recruitment_requirements
                              └── applicants (with fit_score, ai_summary)
```

---

## 5. Non-Functional Requirements

### Performance
- Club directory search uses deferred rendering for responsiveness on large datasets
- External events poll every 30 seconds for near-real-time updates
- Client-side recommendation scoring (no server round-trip)

### Security
- External DB credentials never exposed to frontend — all access via `external-db-proxy` edge function
- Row-level security (RLS) on sensitive Supabase tables
- Club ownership enforced server-side before write operations
- Admin operations require `has_role` RPC validation
- Verification tokens: SHA-256 hashed, 10-minute expiry, single-use
- Rate limiting on claim attempts (per email + club)
- Disposable email domain blocking
- Lookalike club name detection to prevent impersonation

### Privacy
- Resume data processed in-memory, never stored
- `.edu` emails used only for student verification, not shared
- No data sold to third parties
- No data shared with UC San Diego
- User rights: access, correct, delete account and data

### Accessibility
- Keyboard-navigable forms and modals (Radix primitives)
- Screen reader support via Radix ARIA patterns
- Focus management on modal open/close

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- Mobile-responsive design (viewport-aware via `use-mobile` hook)

---

## 6. UX Patterns & Design System

### Visual Identity
- **Colors**: Gold (primary), Navy (dark backgrounds), Charcoal (text)
- **Fonts**: Space Grotesk (headings/body), Lora (serif accents), Space Mono (monospace)
- **Dark mode**: Supported via CSS class toggle

### Component Library
- shadcn-ui (40+ Radix-based primitives) configured in `components.json`
- Consistent variant system via `class-variance-authority`

### Feedback Patterns
| Pattern | Implementation |
|---------|---------------|
| Success/error messages | Sonner toast notifications |
| Page loading | Full-screen centered `Loader2` spinner |
| Section loading | Inline spinners or `Skeleton` components |
| Button loading | Spinner replaces button text during submit |
| Empty states | Icon + "No [items] yet" + explanation + CTA |
| Confirmation | `AlertDialog` for destructive actions |

### Animations
- Page transitions: Framer Motion slide (x: 20 → 0)
- Micro-interactions: scale-in checkmarks, pulse-gold highlights, shimmer loading
- Scroll indicator: bouncing vertical line (landing page, desktop)
- Custom Tailwind animations: `fade-up`, `scale-in`, `shimmer`, `float`, `pulse-gold`

---

## 7. Future Considerations

These are not current requirements but represent natural extension points observed in the codebase:

- **Multi-university expansion** — External DB pattern supports adding other schools; email gating and scraping sources would need per-school config
- **Reviewer permissions** — Referenced in landing page copy but not yet implemented in recruitment pipeline
- **Mass messaging** — Referenced in provisional restrictions but no messaging feature exists yet
- **Ownership transfers** — `ownership_transfers` table exists with approval workflow schema but no UI
- **Event sources management** — `event_sources` table tracks scraping sources with sync status but no admin UI for managing them
- **React Query optimization** — TanStack React Query is installed and configured but custom hooks primarily use local state; migration could improve caching and background refetching
