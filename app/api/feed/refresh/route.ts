import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropicClient, runServerTools, extractJson, verifySourceAlignment } from "@/lib/llm";
import { computePriorityScore } from "@/lib/scoring";
import type { IntelType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_CANDIDATES = 5;

interface Candidate {
  type: IntelType;
  title: string;
  description: string;
  source_url: string;
  category: string;
  recommendation: string;
  confidence: number | null;
}

function normalizeCandidates(raw: unknown): Candidate[] {
  const arr =
    raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)
      ? (raw as { items: unknown[] }).items
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
  const out: Candidate[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    const source_url = String(o.source_url ?? "").trim();
    if (!title || !/^https?:\/\//i.test(source_url)) continue;
    const conf = Number(o.confidence);
    out.push({
      type: o.type === "threat" ? "threat" : "opportunity",
      title,
      description: String(o.description ?? "").trim(),
      source_url,
      category: String(o.category ?? "").trim(),
      recommendation: String(o.recommendation ?? "").trim(),
      confidence: Number.isNaN(conf) ? null : Math.min(1, Math.max(0, conf)),
    });
  }
  return out;
}

export async function POST(req: Request) {
  let focus = "";
  try {
    const body = await req.json();
    focus = String(body?.focus ?? "").trim();
  } catch {
    /* ignore */
  }

  const supabase = await createClient();

  // Load enabled watch topics.
  const { data: wl, error: wlErr } = await supabase
    .from("watchlist")
    .select("topic,category,enabled")
    .eq("enabled", true);
  if (wlErr) {
    const needsMigration = /relation .*watchlist.* does not exist/i.test(wlErr.message);
    return NextResponse.json(
      {
        error: needsMigration
          ? "The feed tables aren't in the database yet — apply supabase/migrations/0004_feed.sql, then retry."
          : wlErr.message,
      },
      { status: needsMigration ? 409 : 500 },
    );
  }
  const topics = (wl as { topic: string; category: string | null }[]) ?? [];
  if (topics.length === 0) {
    return NextResponse.json({ error: "No enabled watch topics. Add some to the watch-list first." }, { status: 400 });
  }

  // ── Stage 1: live web search → candidate items with real source URLs ────────
  let candidates: Candidate[];
  try {
    const { model } = anthropicClient();
    const topicList = topics.map((t) => `- ${t.topic}${t.category ? ` [${t.category}]` : ""}`).join("\n");
    const system = `You are a market-intelligence analyst for MP Biomedicals (life-science research reagents, antibodies, assay kits, diagnostics).
Use the web_search tool to find RECENT, real business/commercial developments relevant to the watch topics below.
Prioritise the last ~30 days and genuinely significant items (acquisitions, partnerships, funding, regulatory changes, tenders).
For EACH item you report you MUST have a specific real source URL taken from your search results — never invent a URL.
Return up to ${MAX_CANDIDATES} of the strongest items as ONLY JSON (no prose, no code fences):
{"items":[{"type":"opportunity"|"threat","title":"short label","description":"2-3 factual sentences a source could confirm","source_url":"the real article URL from search","category":"one of: Competitor & M&A | Funding & grants | Regulatory | Tenders / RFPs","recommendation":"one concrete suggested response for the BD team","confidence":0.0-1.0}]}`;
    const user = `Watch topics:\n${topicList}\n${focus ? `\nExtra focus for this run: ${focus}\n` : ""}\nSearch the web and return the JSON now.`;

    const msg = await runServerTools({
      model,
      max_tokens: 3072,
      system,
      messages: [{ role: "user", content: user }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (msg.stop_reason === "refusal") {
      return NextResponse.json({ error: "The AI declined this search. Try adjusting your watch topics." }, { status: 502 });
    }
    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
    candidates = normalizeCandidates(extractJson(raw)).slice(0, MAX_CANDIDATES);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "NoKeyError") {
      return NextResponse.json(
        { error: "The feed needs the Claude API key (ANTHROPIC_API_KEY) to be set.", noKey: true },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The web search failed." },
      { status: 502 },
    );
  }

  if (candidates.length === 0) {
    return NextResponse.json({ posted: [], filtered: [], counts: { found: 0, posted: 0, filtered: 0, duplicates: 0 } });
  }

  // ── Dedup against existing items (and within this batch) ────────────────────
  const { data: existing } = await supabase.from("intel_items").select("source_url");
  const seen = new Set(
    ((existing as { source_url: string | null }[]) ?? [])
      .map((r) => (r.source_url ?? "").trim().replace(/\/+$/, "").toLowerCase())
      .filter(Boolean),
  );
  const filtered: { title: string; url: string; reason: string }[] = [];
  const fresh: Candidate[] = [];
  let duplicates = 0;
  for (const c of candidates) {
    const key = c.source_url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    fresh.push(c);
  }

  // ── Stage 2: STRICT verification via web_fetch — post only confirmed ────────
  const verdicts = await Promise.all(
    fresh.map(async (c) => {
      try {
        const v = await verifySourceAlignment(c.source_url, { title: c.title, description: c.description });
        return { c, v };
      } catch {
        return { c, v: { status: "unreachable" as const, notes: "Verification failed." } };
      }
    }),
  );

  const toInsert: Record<string, unknown>[] = [];
  const posted: { title: string; type: string; category: string; source_url: string }[] = [];
  for (const { c, v } of verdicts) {
    if (v.status === "aligned") {
      toInsert.push({
        title: c.title,
        type: c.type,
        description: c.description || null,
        source_url: c.source_url,
        recommendation: c.recommendation || null,
        confidence: c.confidence,
        category: c.category || null,
        status: "new",
        source: "feed",
        review_status: "unreviewed",
        priority_score: computePriorityScore({
          type: c.type,
          confidence: c.confidence,
          source_url: c.source_url,
          actionCount: 0,
        }),
        source_check_status: "aligned",
        source_check_notes: v.notes,
        source_checked_at: new Date().toISOString(),
      });
      posted.push({ title: c.title, type: c.type, category: c.category, source_url: c.source_url });
    } else {
      filtered.push({
        title: c.title,
        url: c.source_url,
        reason: `${v.status === "unreachable" ? "Source couldn't be verified" : "Source didn't confirm the claim"} — ${v.notes}`,
      });
    }
  }

  if (toInsert.length) {
    const { error: insErr } = await supabase.from("intel_items").insert(toInsert);
    if (insErr) {
      const needsMigration = /column .* does not exist|violates check constraint/i.test(insErr.message);
      return NextResponse.json(
        {
          error: needsMigration
            ? "The feed columns aren't in the database yet — apply supabase/migrations/0004_feed.sql, then retry."
            : insErr.message,
        },
        { status: needsMigration ? 409 : 500 },
      );
    }
  }

  return NextResponse.json({
    posted,
    filtered,
    counts: {
      found: candidates.length,
      posted: posted.length,
      filtered: filtered.length,
      duplicates,
    },
  });
}
