# Intelligence Layer

## Messy Inputs
- Free-text research query from user (e.g. "biosimilar reagent market shifts Q3 2024").
- OpenAI returns unstructured prose — must be parsed into structured intel items.
- User may paste a news article URL or raw text for manual entry.

## Auto-Structure Schema (AI scan response JSON)
```json
{
  "items": [
    {
      "type": "opportunity",
      "title": "EU cell therapy reagent deregulation opens market",
      "description": "New EU guidance reduces approval timeline for research-use reagents...",
      "source_url": "https://example.com/news/eu-reagents",
      "confidence": 0.82,
      "recommendation": "Fast-track 3 existing products for EU distribution; assign to product specialist for compliance review.",
      "priority_score": 78
    }
  ]
}
```

## Events to Track
- `research_run.started` — query submitted.
- `research_run.completed` — results returned.
- `intel_item.created` — saved (manual or AI).
- `intel_item.status_changed` — new → triaged → acting → closed.
- `action.created` / `action.status_changed`.

## Scoring Rules (rule-based v1)
- Base 50 points.
- +20 if type = threat (urgency bias).
- +15 if confidence > 0.8.
- +10 if source_url present.
- +5 per linked action (signals active follow-up).
- Cap at 100.
- Recompute on item create, status change, action create.

## What Gets Ranked
Dashboard sorts `intel_items` by `priority_score` desc, then by `created_at` desc.

## v1 vs Later
- **v1**: single-prompt scan → structured JSON → reviewable drafts. Rule-based scoring.
- **Later**: multi-source aggregation (news APIs + RSS), trend detection over time, ML scoring, recurring scheduled scans.
