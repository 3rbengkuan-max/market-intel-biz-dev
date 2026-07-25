# Tasks & Sprints

## Sprint 1 — Database + Core CRUD (v1 functional)
**Goal**: App works end-to-end with seed data, no login required.

- [ ] Create Supabase tables: `intel_items`, `actions`, `research_runs` with RLS permissive policies.
- [ ] Seed 5 demo intel items (mix of opportunities/threats relevant to MP Biomedicals) + 3 demo actions.
- [ ] Build dashboard: list intel items ranked by priority_score, filter by type (opportunity/threat) and status.
- [ ] Build intel item detail view: description, source link, recommendation, linked actions list.
- [ ] Create/edit intel item form (manual entry: title, type, description, source_url, recommendation).
- [ ] Create/edit action form: title, action_type, assignee_name, assignee_role, due_date, status.
- [ ] Delete intel item + delete action with confirmation modal.
- [ ] Status transitions on intel items (new → triaged → acting → closed) and actions (draft → planned → in_progress → done).
- [ ] Handle loading, empty, and error states on all screens.

**Definition of Done**: User can view the seeded dashboard, create a new intel item, add an action with an assignee, change statuses, and see it reflected — all without logging in. No dead buttons.

## Sprint 2 — AI Research Scan
**Goal**: Core engine — AI scan produces reviewable intel items.

- [ ] Server route `/api/scan` accepting a query string, calling OpenAI with structured prompt.
- [ ] Parse AI JSON response into draft intel item cards on a review screen.
- [ ] User edits draft fields, selects which to save, clicks Save → persists to `intel_items`.
- [ ] Log a `research_runs` row on each scan (query, status, result_count).
- [ ] Error state: if OpenAI call fails, show message and let user retry or switch to manual entry.
- [ ] Loading state: show spinner/progress while scan runs.

**Definition of Done**: User enters a query, gets 3–5 AI-generated intel item drafts, edits and saves at least one, and it appears on the dashboard. This is the v1 success scenario.

## Sprint 3 — Lock It Down
**Goal**: Auth + per-user data isolation before real use.

- [ ] Add Supabase Auth (email/password or magic link).
- [ ] Set `user_id` NOT NULL on all tables.
- [ ] Replace permissive RLS policies with `auth.uid() = user_id` owner-scoped policies.
- [ ] Seed data reassigned to a demo user account.
- [ ] Login/signup page; redirect unauthenticated users from CRUD screens (dashboard still viewable as demo).
- [ ] Test: user A cannot read user B's data.

**Definition of Done**: Auth works, a logged-in user sees only their own intel items and actions, and an anonymous visitor sees the demo dashboard only.

## Simple Gantt
```
Sprint 1:  [DB + CRUD + Dashboard]  ← v1 functional milestone
Sprint 2:  [AI Research Scan]      ← v1 success scenario usable
Sprint 3:  [Lock It Down — Auth + RLS]
```
