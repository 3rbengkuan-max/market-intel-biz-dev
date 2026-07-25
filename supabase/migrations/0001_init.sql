-- Market Intel & Biz Dev — initial schema (v1, demo-first, no login)
-- Tables: research_runs, intel_items, actions
-- RLS enabled with permissive policies for anon/authenticated (demo phase).
-- Owner-scoped policies come in the "lock it down" sprint.

-- ── research_runs ────────────────────────────────────────────────────────────
create table if not exists public.research_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  query         text not null,
  status        text not null default 'running'
                  check (status in ('running','completed','failed')),
  result_count  int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── intel_items ──────────────────────────────────────────────────────────────
create table if not exists public.intel_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  title           text not null,
  type            text not null check (type in ('opportunity','threat')),
  description     text,
  source_url      text,
  priority_score  numeric not null default 50,
  status          text not null default 'new'
                    check (status in ('new','triaged','acting','closed')),
  recommendation  text,
  confidence      numeric,
  source          text not null default 'manual'
                    check (source in ('ai_scan','manual','import')),
  review_status   text not null default 'unreviewed'
                    check (review_status in ('unreviewed','reviewed','rejected')),
  research_run_id uuid references public.research_runs(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists intel_items_rank_idx
  on public.intel_items (priority_score desc, created_at desc);

-- ── actions ──────────────────────────────────────────────────────────────────
create table if not exists public.actions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  intel_item_id  uuid not null references public.intel_items(id) on delete cascade,
  title          text not null,
  description    text,
  action_type    text check (action_type in ('develop','leverage','mitigate','monitor')),
  status         text not null default 'draft'
                   check (status in ('draft','planned','in_progress','done')),
  assignee_name  text,
  assignee_role  text,
  due_date       date,
  created_at     timestamptz not null default now()
);

create index if not exists actions_intel_item_idx
  on public.actions (intel_item_id);

-- ── RLS: demo-first permissive policies ──────────────────────────────────────
alter table public.research_runs enable row level security;
alter table public.intel_items  enable row level security;
alter table public.actions      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['research_runs','intel_items','actions'] loop
    execute format('drop policy if exists %I on public.%I', 'demo_all_'||t, t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      'demo_all_'||t, t);
  end loop;
end $$;
