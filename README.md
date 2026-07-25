# Market Intel & Biz Dev

Internal market-intelligence tool for the MP Biomedicals business-development team:
capture AI-researched market **opportunities and threats**, rank them by priority,
assign response **actions** to teammates, and track follow-up — replacing spreadsheets
with a shared dashboard.

Built from the plan in [`/docs`](docs/) (PRD, data model, architecture, tasks).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript |
| Styles | Tailwind CSS v4 |
| Database | Supabase (Postgres + RLS) |
| AI research scan | Anthropic Claude (`@anthropic-ai/sdk`), server-side |
| Deploy | Vercel (auto-deploy from `main`) |

## Core objects

- **intel_items** — an opportunity or threat (AI-researched or manual), ranked by a
  rule-based `priority_score` (see `lib/scoring.ts`).
- **actions** — a response task on an intel item, with assignee, role, due date, status.
- **research_runs** — a logged AI scan (query, status, result count).

## The main workflow

1. Enter a topic on **Run AI scan** → Claude returns 3–5 draft intel cards.
2. Review / edit / select the drafts → **Save** persists them to the dashboard.
3. Open an item → **Add action**, assign a teammate + due date.
4. Everything is ranked by priority; change statuses as you act. No dead buttons.

The app is **demo-first (no login)** and degrades gracefully: if no Claude key is set,
the AI scan points you to manual entry and every other feature still works.

## Local development

```bash
npm install
vercel env pull .env.local     # Supabase URL + anon key (+ ANTHROPIC_API_KEY if set)
npm run dev
```

Open http://localhost:3000.

## Database

Schema + seed live in [`supabase/migrations`](supabase/migrations/) (combined for
convenience in `supabase/apply_all.sql`). Apply once via the Supabase dashboard →
SQL Editor, or the Supabase CLI. Tables use permissive RLS for the demo phase;
owner-scoped policies come with the auth lock-down sprint.

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase access |
| `ANTHROPIC_API_KEY` | Enables the live AI research scan (optional — app works without it) |
| `ANTHROPIC_MODEL` | Optional model override (default `claude-opus-5`) |

See [CLAUDE.md](CLAUDE.md) for build conventions and the deploy workflow.
