# Data Model

## Table: intel_items
Core object — an opportunity or threat, possibly AI-generated.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid | nullable (owner-scope later) |
| title | text not null | short label |
| type | text not null | 'opportunity' \| 'threat' |
| description | text | detailed explanation |
| source_url | text | link to source article/feed |
| priority_score | numeric | 0–100, higher = more urgent |
| status | text | 'new' \| 'triaged' \| 'acting' \| 'closed' default 'new' |
| recommendation | text | suggested response (AI or manual) |
| confidence | numeric | 0–1, AI confidence |
| source | text | 'ai_scan' \| 'manual' \| 'import' |
| review_status | text | 'unreviewed' \| 'reviewed' \| 'rejected' default 'unreviewed' |
| research_run_id | uuid | nullable FK to research_runs |
| created_at | timestamptz | default now() |

**Relationships**: has many `actions`. Optionally belongs to `research_runs`.

## Table: actions
A project/activity responding to an intel item.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| intel_item_id | uuid not null | FK to intel_items |
| title | text not null | |
| description | text | |
| action_type | text | 'develop' \| 'leverage' \| 'mitigate' \| 'monitor' |
| status | text | 'draft' \| 'planned' \| 'in_progress' \| 'done' default 'draft' |
| assignee_name | text | person responsible |
| assignee_role | text | sales / marketing / R&D / service / BD |
| due_date | date | nullable |
| created_at | timestamptz | default now() |

**Relationships**: belongs to `intel_items`.

## Table: research_runs
Log of an AI research scan.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| query | text not null | the search topic entered |
| status | text | 'running' \| 'completed' \| 'failed' default 'running' |
| result_count | int | items produced |
| created_at | timestamptz | default now() |

**Relationships**: has many `intel_items`.

## RLS / Permissions (v1 — demo-first)
- All tables: RLS enabled, permissive select + write policies (no login required).
- Lock-down sprint: replace with `auth.uid() = user_id` owner-scoped policies.
