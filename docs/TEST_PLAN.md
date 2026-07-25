# Test Plan

## v1 Success Scenario (manual)
1. Open app in browser (no login) → dashboard renders with 5 seeded intel items ranked by priority.
2. Filter by type = "threat" → only threat items shown.
3. Click an intel item → detail view shows description, source link, recommendation, linked actions.
4. Click "New Intel Item" → fill title, type=opportunity, description, source_url, recommendation → Save → dashboard updates with new item.
5. Open the new item → click "Add Action" → fill title, action_type=develop, assignee_name="Sarah Chen", assignee_role="Product Specialist", due_date → Save → action appears under the item.
6. Change item status from "new" to "triaged" → badge updates.
7. Run AI scan: enter query "competitor acquisitions in reagents" → wait for results → 3–5 draft cards appear → edit one title → Save → item appears on dashboard.
8. Delete an action → confirmation modal → confirm → action removed from list.

## Empty States
- Dashboard with no items (delete all or fresh DB): show "No intel items yet. Run a research scan or create one manually." with CTA buttons.
- Intel item detail with no actions: show "No actions yet. Add one to start tracking." with CTA.

## Error States
- AI scan route fails (bad key / network): show "Scan failed. You can retry or create an item manually." with retry button + manual-create link.
- Supabase write fails (RLS / network): show "Could not save. Please try again." — form retains entered data.
- Page load fails: show error message with reload button.

## Loading States
- Dashboard initial load: skeleton cards or spinner.
- AI scan in progress: spinner with "Researching..." text and cancel button.
- Save action: button shows "Saving..." disabled until complete.

## Permission Check (post-lock-down)
- Log in as user A, create an item. Log out, log in as user B — item from A is NOT visible.
- Anonymous visitor: sees demo dashboard only; CRUD buttons redirect to login.
