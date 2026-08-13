-- Daily feed: an editable watch-list + support for feed-sourced intel items.
-- Additive + idempotent.

-- Watch-list of topics the feed searches each refresh.
create table if not exists public.watchlist (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null unique,
  category   text,
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.watchlist enable row level security;
drop policy if exists demo_all_watchlist on public.watchlist;
create policy demo_all_watchlist on public.watchlist
  for all to anon, authenticated using (true) with check (true);

-- Allow 'feed' as an intel source and add an optional category tag.
alter table public.intel_items drop constraint if exists intel_items_source_check;
alter table public.intel_items add constraint intel_items_source_check
  check (source in ('ai_scan','manual','import','feed'));
alter table public.intel_items add column if not exists category text;

-- Seed recommended watch topics (competitor/M&A, funding, regulatory, tenders).
insert into public.watchlist (topic, category) values
  ('competitor acquisitions and M&A among life-science research reagent and antibody suppliers', 'Competitor & M&A'),
  ('new partnerships and distribution deals for research reagents, antibodies and diagnostics', 'Competitor & M&A'),
  ('biotech and life-science tools funding rounds and venture investment', 'Funding & grants'),
  ('NIH, EU Horizon and government research funding changes affecting reagent demand', 'Funding & grants'),
  ('regulatory changes for research-use reagents, IVDR and in-vitro diagnostics approvals', 'Regulatory'),
  ('tenders, RFPs and procurement notices for laboratory reagents and diagnostics', 'Tenders / RFPs')
on conflict (topic) do nothing;
