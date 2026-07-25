# Market Intel & Biz Dev — PRD

## Problem
Business development team at MP Biomedicals tracks market opportunities and threats in spreadsheets and chat. No structured system to capture, prioritize, assign, and act on intel. Information is scattered, unranked, and hard to follow up.

## Target User
Cross-functional team (5–6 people): sales manager, business developer, product specialist, field application scientist, customer service specialist — led by the BD director. Shared internal tool, daily use.

## Core Objects
- **Intel Item** — an opportunity or threat (AI-researched) with source, confidence, recommendation.
- **Action** — a project/activity to develop, leverage, mitigate, or monitor an intel item; assigned to a person with a due date and status.
- **Research Run** — a logged AI scan that produced intel items from web sources.

## MVP (v1) — checklist
- [ ] Dashboard: list of intel items (opportunities + threats) ranked by priority, filterable by type/status.
- [ ] Intel item detail view: full description, source link, AI recommendation, linked actions.
- [ ] Create/edit intel item manually (not just AI-seeded).
- [ ] Create/edit action on an intel item; assign person + role + due date + status.
- [ ] Run AI research scan: enter a query/topic, AI returns 3–5 intel items with recommendations; user reviews and saves.
- [ ] All CRUD persists to database; UI reflects changes immediately.
- [ ] Works without login (demo-first with seed data).

## Non-goals (v1)
- User auth / login / per-user isolation (later sprint).
- Automated web scraping / cron schedules.
- Email or Slack notifications.
- External API integrations beyond the AI research call.
- Reporting / export to PDF.

## Success Criteria
_BD director enters "competitor acquisitions in reagents", runs AI scan, reviews 4 resulting intel items (2 opportunities, 2 threats), saves 3, creates a "monitor" action assigned to the product specialist with a due date, and sees it on the dashboard — all without touching a spreadsheet._
