# Agentic Layer

## Risk Levels & Actions

### Low risk — auto-execute
- **Summarize source** — AI generates description from source URL/text.
- **Tag type** — AI classifies as opportunity/threat.
- **Score** — AI assigns confidence + priority_score.
- **Draft recommendation** — AI writes suggested response text.

All stored with `source='ai_scan'`, `review_status='unreviewed'`. User must click Save to persist — auto-generation does not write to DB directly.

### Medium risk — light approval
- **Create intel item from scan** — user reviews draft cards, edits, then saves. One click per item.
- **Create action** — user fills assignee/due date; one click persists.
- **Update status** — user clicks status transition on item or action.

### High risk — always approval
- **Delete intel item** — confirmation modal required.
- **Delete action** — confirmation modal required.

### Critical — human-only
- **No automated external communication** in v1. No email, Slack, or external API calls triggered by the app. All are later-phase.

## Named Tools (v1)
- `ai_research_scan` — server route, OpenAI call with structured prompt. No arbitrary tool execution.
- No `run_any` / `send_any` patterns. The AI can only return structured JSON to the review screen.

## Audit Log Fields (future `audit_logs` table)
- id, user_id, action_type, entity_type, entity_id, details (jsonb), created_at.
- v1: not yet implemented; tracked via `created_at` + `source` + `review_status` on intel items.
- Later: dedicated audit_logs table for all status transitions and deletes.

## v1 vs Later
- **v1**: AI scan → reviewable drafts → manual save. No autonomous writes.
- **Later**: audit_logs table, scheduled autonomous scans with email digest, auto-create draft actions from recommendations.
