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
      recommendation: String(o.recommendation ?? "").trim(),
      confidence: Number.isNaN(conf) ? null : Math.min(1, Math.max(0, conf)),
    });
  }
  return out.slice(0, MAX_CANDIDATES);
}

export async function POST(req: Request) {
  let query = "";
  try {
    const body = await req.json();
    query = String(body?.query ?? "").trim();
  } catch {
    /* ignore */
  }
  if (!query) {
    return NextResponse.json({ error: "Please enter a research topic." }, { status: 400 });
  }

  const supabase = await createClient();

  let runId: string | null = null;
  const { data: run } = await supabase
    .from("research_runs")
    .insert({ query, status: "running", result_count: 0 })
    .select("id")
    .maybeSingle();
  runId = run?.id ?? null;

  // ── Stage 1: live web search on the query → candidates with real URLs ────────
  let candidates: Candidate[];
  try {
    const { model } = anthropicClient();
    const system = `You are a market-intelligence analyst for MP Biomedicals (life-science research reagents, antibodies, assay kits, diagnostics).
Use the web_search tool to find RECENT, real developments matching the user's research query that are relevant to the business development team.
Each item MUST have a specific real source URL taken from your search results — never invent a URL.
Return up to ${MAX_CANDIDATES} of the strongest items as ONLY JSON (no prose, no code fences):
{"items":[{"type":"opportunity"|"threat","title":"short label","description":"2-3 factual sentences a source could confirm","source_url":"the real article URL from search","recommendation":"one concrete suggested response","confidence":0.0-1.0}]}`;
    const msg = await runServerTools({
      model,
      max_tokens: 3072,
      system,
      messages: [{ role: "user", content: `Research query: ${query}\n\nSearch the web and return the JSON now.` }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (msg.stop_reason === "refusal") {
      if (runId) await supabase.from("research_runs").update({ status: "failed" }).eq("id", runId);
      return NextResponse.json({ error: "The AI declined this search. Try a different topic." }, { status: 502 });
    }
    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
    candidates = normalizeCandidates(extractJson(raw));
  } catch (e: unknown) {
    if (runId) await supabase.from("research_runs").update({ status: "failed" }).eq("id", runId);
    const isNoKey = e instanceof Error && e.name === "NoKeyError";
    return NextResponse.json(
      {
        error: isNoKey
          ? "The AI research scan isn't configured yet (no Claude API key set). You can still add intel items manually."
          : e instanceof Error
            ? e.message
            : "The web search failed. Please try again or add intel manually.",
        noKey: isNoKey,
        runId,
      },
      { status: isNoKey ? 503 : 502 },
    );
  }

  // ── Stage 2: STRICT source verification — only keep confirmed items ──────────
  const filtered: { title: string; url: string; reason: string }[] = [];
  const verified: Array<Candidate & { priority_score: number; source_check_notes: string }> = [];

  const verdicts = await Promise.all(
    candidates.map(async (c) => {
      try {
        const v = await verifySourceAlignment(c.source_url, { title: c.title, description: c.description });
        return { c, v };
      } catch {
        return { c, v: { status: "unreachable" as const, notes: "Verification failed." } };
      }
    }),
  );
  for (const { c, v } of verdicts) {
    if (v.status === "aligned") {
      verified.push({
        ...c,
        priority_score: computePriorityScore({
          type: c.type,
          confidence: c.confidence,
          source_url: c.source_url,
          actionCount: 0,
        }),
        source_check_notes: v.notes,
      });
    } else {
      filtered.push({
        title: c.title,
        url: c.source_url,
        reason: `${v.status === "unreachable" ? "Source couldn't be verified" : "Source didn't confirm the claim"} — ${v.notes}`,
      });
    }
  }

  if (runId) {
    await supabase
      .from("research_runs")
      .update({ status: "completed", result_count: verified.length })
      .eq("id", runId);
  }

  return NextResponse.json({ runId, items: verified, filtered, foundCount: candidates.length });
}
