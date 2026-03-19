# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
```

Supabase Edge Functions are in `supabase/functions/` and run on Deno.

## Architecture

**Unicircle Connect** is a university club discovery and recruitment platform built with React 18 + TypeScript + Vite (SWC). It uses shadcn/ui components with Tailwind CSS and a custom gold/navy brand palette.

### Dual Supabase Architecture

The most important architectural decision: **two separate Supabase instances**.

- **Internal Supabase** (`VITE_SUPABASE_URL`): Auth, user data, club ownership, recruitment pipeline, waitlist, and all RLS-protected tables. Client initialized in `src/integrations/supabase/client.ts` with auto-generated types in `types.ts`.
- **External Supabase**: Master clubs and events database. **Never accessed directly from the frontend** — all reads/writes go through the `external-db-proxy` edge function, which enforces table/column allowlists, ownership checks, and audit logging.

### State Management

No global state library. All domain state lives in custom hooks (`src/hooks/`):
- `useAuth` — Supabase Auth session
- `useClubOwnership` — club ownership with graduated trust (`unverified → provisional → verified`)
- `useExternalDB` — `useClubs()` / `useEvents()` fetched via the proxy
- `useRecruitment` — applicant pipeline for club admins
- TanStack React Query wraps the app root for server state caching

### Routing

All routes are flat in `App.tsx` using React Router DOM 7. No route-level auth guards — auth checks happen inside individual pages/components via `useAuth`.

Key route groups:
- `/dashboard`, `/clubs`, `/calendar` — student-facing
- `/club-admin/clubs/:clubId/*` — club administration (events, edit, recruitment)
- `/admin/*` — platform admin

### Club Trust System

Graduated ownership model enforced server-side: `unverified → provisional → verified → suspended`. Per-club permissions (`can_publish_events`, `can_mass_message`, `can_add_links`) are gated by trust level. University email domains have pre-seeded trust levels.

### Edge Functions (Deno)

16 functions in `supabase/functions/`. Key ones:
- `external-db-proxy` — proxies all external DB access with auth + audit
- `ai-screen-applicants` — AI applicant scoring
- `extract-event-from-flyer` — OCR from uploaded flyers
- `extract-resume-keywords` — resume parsing
- `scrape-*` / `discover-*` — web scraping for club data enrichment

### UI Patterns

- shadcn/ui primitives in `src/components/ui/` (~51 components), all using `cn()` from `src/lib/utils.ts`
- Domain components grouped under `src/components/{calendar,club-admin,dashboard,recruitment,onboarding}/`
- `@dnd-kit` for Kanban drag-and-drop in recruitment
- FullCalendar for event calendar views
- Path alias `@` maps to `./src`

### Key Data Types

`src/data/mockData.ts` defines the `Club` and `Event` TypeScript interfaces used throughout the app. Live data comes from the external DB; mock data serves as type reference.
