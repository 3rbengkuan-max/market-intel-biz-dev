-- Source-alignment check: does an intel item's source_url actually back up the claim?
-- Populated by /api/verify (fetch source + Claude judgment). Additive + idempotent.

alter table public.intel_items
  add column if not exists source_check_status text
    check (source_check_status in
      ('unchecked','aligned','partial','misaligned','unreachable'))
    default 'unchecked',
  add column if not exists source_check_notes text,
  add column if not exists source_checked_at timestamptz;
