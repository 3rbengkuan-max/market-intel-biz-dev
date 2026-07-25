# Security

## Secret Handling
- OpenAI API key stored as Vercel environment variable (`OPENAI_API_KEY`), server-side only.
- Never exposed to the frontend; never in client bundles.
- Supabase service key server-side only; anon key is public (safe for RLS-protected reads/writes).

## Permission Model (v1 — demo-first)
- RLS enabled on all tables with permissive policies: anyone can read/write.
- No auth wall — app renders for anonymous visitors with seed data.
- **Lock-down sprint**: replace permissive policies with `auth.uid() = user_id` owner-scoped policies. Every row carries `user_id` (nullable now, NOT NULL after lock-down). This is the END state.

## Approved-Tools Rule
- The AI scan route is the only AI tool. It sends a structured prompt to OpenAI and returns JSON.
- No generic tool execution, no arbitrary function calling, no raw SQL from the AI.
- The AI cannot write to the database directly — it returns drafts that the user saves.

## Audit Principle
- Every AI-generated field stores `source` + `confidence` + `review_status` so provenance is always visible.
- Status transitions and deletes require explicit user action (click + confirm).
- Future: dedicated `audit_logs` table for all meaningful actions (create/update/delete/status-change).

## Honesty
- If the lock-down RLS migration or auth setup is beyond current builder skill, stop and get a human before exposing real company data.
- Do not mark auth/RLS as secure until a real test confirms a user cannot read another user's data.
