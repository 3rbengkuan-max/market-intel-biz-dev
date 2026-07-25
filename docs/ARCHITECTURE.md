# Architecture

## Stack
- **Frontend**: Next.js (App Router, TypeScript, Tailwind) on Vercel.
- **Database**: Supabase (Postgres + RLS).
- **AI**: OpenAI API (server-side route) for research scans and recommendations.
- **No auth in v1** — demo-first; login added in lock-down sprint.

## What to build now vs later

**Now (v1):**
- Intel items CRUD + dashboard with ranking.
- Actions CRUD linked to intel items with assignee/due date/status.
- AI research scan: server route calls OpenAI, returns structured intel items, user reviews and saves.
- Seed data so the app renders immediately for anonymous visitors.

**Later:**
- Auth + per-user RLS owner policies.
- Scheduled recurring scans.
- Notifications (email/Slack).
- Team member directory with profiles.
- Export / reporting.

## Key user action flow (AI research scan)
1. User types a research query on the dashboard (e.g. "new cell therapy reagent regulations in EU").
2. Next.js server route sends prompt to OpenAI, instructs it to return structured JSON: array of intel items with type, title, description, source URL, confidence, recommendation.
3. Results render as reviewable draft cards (not yet saved).
4. User edits/discards items, then clicks Save — each card persists to `intel_items` with `review_status='unreviewed'`.
5. Dashboard refreshes; new items appear ranked by priority score.
6. User opens an item, creates an Action assigned to a teammate.

## Layer plan
1. **Data layer**: Postgres tables (`intel_items`, `actions`, `research_runs`) with RLS permissive policies for demo.
2. **App logic**: CRUD server actions; AI scan route; ranking by priority score.
3. **Smart features**: AI-generated fields (description, recommendation, confidence) stored with `source` + `review_status`; manual override always available.

## Why the core runs without AI
All CRUD (create/edit intel items, create/edit actions, ranking, dashboard) is pure database + app logic. The AI scan is one optional entry path — if the OpenAI key is absent or the call fails, the user can still manually create intel items and actions and use the full dashboard. The app degrades to a manual intel tracker, not a blank screen.
