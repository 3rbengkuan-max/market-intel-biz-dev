import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { computePriorityScore } from "@/lib/scoring";
import type { IntelType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ScanItem {
  type: IntelType;
  title: string;
  description: string;
  source_url: string;
  confidence: number | null;
  recommendation: string;
  priority_score: number;
}

const SYSTEM_PROMPT = `You are a market intelligence analyst for MP Biomedicals, a company that manufactures and sells life-science research reagents, antibodies, assay kits, and diagnostics.
Given a research topic, identify 3 to 5 concrete market INTEL ITEMS — each an OPPORTUNITY or a THREAT relevant to the business development team.
Make each item specific and actionable. Mix opportunities and threats. Keep descriptions realistic and clearly analytical — do not present invented company names or numbers as confirmed fact.

Respond with ONLY a JSON object (no prose, no markdown code fences, no internal or system tags) in exactly this shape:
{"items":[{"type":"opportunity"|"threat","title":"short label","description":"2-4 sentences","source_url":"https URL or empty string","confidence":0.0-1.0,"recommendation":"one concrete suggested response","priority_score":0-100}]}`;

/** Pull the first balanced JSON object out of a model response, tolerating stray prose or code fences. */
function extractJson(text: string): unknown {
  const fenced = text.replace(/```(?:json)?/gi, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI returned an unexpected response. Please retry.");
  }
  return JSON.parse(fenced.slice(start, end + 1));
}

function clampConfidence(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return null;
  return Math.min(1, Math.max(0, n));
}

function normalizeItems(raw: unknown): ScanItem[] {
  const arr =
    raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)
      ? (raw as { items: unknown[] }).items
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
  const out: ScanItem[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const type: IntelType = o.type === "threat" ? "threat" : "opportunity";
    const title = String(o.title ?? "").trim();
    if (!title) continue;
    const confidence = clampConfidence(o.confidence);
    const source_url = String(o.source_url ?? "").trim();
    const priority_score =
      typeof o.priority_score === "number"
        ? Math.min(100, Math.max(0, Math.round(o.priority_score)))
        : computePriorityScore({ type, confidence, source_url, actionCount: 0 });
    out.push({
      type,
      title,
      description: String(o.description ?? "").trim(),
      source_url,
      confidence,
      recommendation: String(o.recommendation ?? "").trim(),
      priority_score,
    });
  }
  return out.slice(0, 5);
}

async function callClaude(query: string): Promise<ScanItem[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error("no_anthropic_key");
    err.name = "NoKeyError";
    throw err;
  }
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    // Disable thinking to keep this interactive scan fast and within serverless limits.
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: `Research topic: ${query}` }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined this request. Try a different topic or add intel manually.");
  }

  const text = response.content.find((b) => b.type === "text");
  const raw = text && "text" in text ? text.text : "";
  const items = normalizeItems(extractJson(raw));
  if (items.length === 0) throw new Error("No intel items could be parsed from the AI response.");
  return items;
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

  // Log the run as "running" (best-effort — don't block the scan if logging fails).
  let runId: string | null = null;
  const { data: run } = await supabase
    .from("research_runs")
    .insert({ query, status: "running", result_count: 0 })
    .select("id")
    .maybeSingle();
  runId = run?.id ?? null;

  try {
    const items = await callClaude(query);
    if (runId) {
      await supabase
        .from("research_runs")
        .update({ status: "completed", result_count: items.length })
        .eq("id", runId);
    }
    return NextResponse.json({ runId, items });
  } catch (e: unknown) {
    if (runId) {
      await supabase.from("research_runs").update({ status: "failed" }).eq("id", runId);
    }
    const isNoKey = e instanceof Error && e.name === "NoKeyError";
    const message = isNoKey
      ? "The AI research scan isn't configured yet (no Claude API key set). You can still add intel items manually — the rest of the app works fully without AI."
      : e instanceof Error
        ? e.message
        : "The AI scan failed. Please try again or add intel manually.";
    return NextResponse.json({ error: message, noKey: isNoKey, runId }, { status: isNoKey ? 503 : 502 });
  }
}
