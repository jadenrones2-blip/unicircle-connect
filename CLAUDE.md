# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniCircle Connect is a student club discovery and management platform. Students browse clubs/events, submit applications, and track memberships. Club admins manage recruitment pipelines, events, and member communications.

**Stack**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn-ui + Supabase (PostgreSQL + Edge Functions)

## Commands

- `npm run dev` — Start dev server on port 8080
- `npm run build` — Production build
- `npm run build:dev` — Development build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build
- E2E tests use Playwright (`npx playwright test`)

## Architecture

### Frontend

- **Pages** (`src/pages/`): 26 route components mapped in `src/App.tsx` via React Router v7
- **Components** (`src/components/`): Feature-grouped directories (club-admin/, dashboard/, recruitment/, calendar/, onboarding/) plus `ui/` for shadcn-ui primitives
- **Hooks** (`src/hooks/`): 17+ custom hooks encapsulate all data fetching and state logic (useAuth, useClubMemberships, useRecruitment, etc.)
- **Data flow**: Custom hooks call Supabase client directly; React Query (TanStack) handles caching and refetching
- **Auth**: Supabase Auth with listener-based session management in `useAuth.ts`

### Backend

- **Supabase Edge Functions** (`supabase/functions/`): 13 serverless functions for AI screening, resume parsing, scraping, notifications, and external integrations
- **Migrations** (`supabase/migrations/`): 27+ SQL migration files for schema evolution
- **Database types**: Auto-generated in `src/integrations/supabase/types.ts`

### Route Categories

- **Public**: `/`, `/login`, `/signup`, `/forgot-password`, `/terms`, `/privacy`
- **Student**: `/dashboard`, `/clubs`, `/clubs/:id`, `/calendar`, `/express-interest`
- **Admin**: `/admin/events`, `/admin-onboarding`
- **Club Admin**: `/club-admin`, `/club-admin/clubs/:clubId/events|edit|recruitment`

## Key Conventions

- **Path alias**: `@/` maps to `src/` (configured in tsconfig.json and vite.config.ts)
- **TypeScript**: Relaxed checking (`noImplicitAny: false`, `strictNullChecks: false`)
- **Styling**: Tailwind utility classes with custom theme tokens (gold, navy, charcoal). Fonts: Space Grotesk (sans), Lora (serif), Space Mono (mono). Dark mode via CSS class.
- **Component library**: shadcn-ui (Radix primitives). Config in `components.json`.
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion + custom Tailwind animations (fade-up, scale-in, shimmer, float, pulse-gold)
- **Hook return pattern**: `{ data, loading, error, ...methods }`
- **Error feedback**: Sonner toast notifications for user-facing errors/success
- **Icons**: Lucide React
