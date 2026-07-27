import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { SourceCheckStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Verdict {
  status: SourceCheckStatus;
  notes: string;
}

/** Reject non-http(s) and obvious private/internal hosts (basic SSRF guard). */
function isFetchableUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return false;
  }
  return true;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSourceText(url: string): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MarketIntelBot/1.0 (source-alignment check)" },
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) return { ok: false, reason: `The source returned HTTP ${resp.status}.` };
    const ctype = resp.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(ctype)) {
      return { ok: false, reason: `The source is not a readable web page (${ctype || "unknown type"}).` };
    }
    const html = await resp.text();
    const text = htmlToText(html);
    if (text.length < 40) return { ok: false, reason: "The source page had no readable text." };
    return { ok: true, text: text.slice(0, 8000) };
  } catch (e: unknown) {
    const msg = e instanceof Error && e.name === "AbortError" ? "The source timed out." : "The source could not be reached.";
    return { ok: false, reason: msg };
  }
}

async function judgeAlignment(
  intel: { title: string; description: string | null },
  sourceText: string,
): Promise<Verdict> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error("no_anthropic_key");
    err.name = "NoKeyError";
    throw err;
  }
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

  const system = `You verify whether a cited web source actually supports a market-intelligence claim.
Compare the INTEL ITEM (title + description) against the SOURCE TEXT extracted from its cited URL.
Decide how well the source backs up the specific claim:
- "aligned": the source clearly supports the core claim.
- "partial": the source is on-topic and partially supports it, but key specifics are missing or only loosely related.
- "misaligned": the source does not support the claim, is about something else, or contradicts it.
Respond with ONLY a JSON object (no prose, no code fences, no internal tags):
{"status":"aligned"|"partial"|"misaligned","notes":"one or two sentences explaining the verdict, citing what the source does or doesn't say"}`;

  const user = `INTEL ITEM
Title: ${intel.title}
Description: ${intel.description ?? "(none)"}

SOURCE TEXT (extracted from the cited URL, truncated):
"""
${sourceText}
"""`;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") {
    return { status: "partial", notes: "The AI declined to assess this source; review it manually." };
  }
  const block = response.content.find((b) => b.type === "text");
  const raw = block && "text" in block ? block.text : "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { status: "partial", notes: "Could not parse the alignment result; review manually." };
  }
  let parsed: { status?: string; notes?: string };
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { status: "partial", notes: "Could not parse the alignment result; review manually." };
  }
  const status: SourceCheckStatus =
    parsed.status === "aligned" || parsed.status === "misaligned" ? parsed.status : "partial";
  return { status, notes: String(parsed.notes ?? "").trim().slice(0, 600) || "No explanation returned." };
}

export async function POST(req: Request) {
  let id = "";
  try {
    const body = await req.json();
    id = String(body?.id ?? "").trim();
  } catch {
    /* ignore */
  }
  if (!id) return NextResponse.json({ error: "Missing intel item id." }, { status: 400 });

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("intel_items")
    .select("id,title,description,source_url")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Intel item not found." }, { status: 404 });

  let verdict: Verdict;
  const url = (item.source_url as string | null)?.trim() ?? "";

  try {
    if (!url) {
      verdict = { status: "unreachable", notes: "No source URL is set for this item." };
    } else if (!isFetchableUrl(url)) {
      verdict = { status: "unreachable", notes: "The source URL is not a valid public http(s) address." };
    } else {
      const fetched = await fetchSourceText(url);
      if (!fetched.ok) {
        verdict = { status: "unreachable", notes: fetched.reason };
      } else {
        verdict = await judgeAlignment(
          { title: item.title as string, description: item.description as string | null },
          fetched.text,
        );
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "NoKeyError") {
      return NextResponse.json(
        {
          error:
            "Source checking needs the Claude API key (ANTHROPIC_API_KEY) to be set. The rest of the app works without it.",
          noKey: true,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The source check failed." },
      { status: 502 },
    );
  }

  const checked_at = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("intel_items")
    .update({
      source_check_status: verdict.status,
      source_check_notes: verdict.notes,
      source_checked_at: checked_at,
    })
    .eq("id", id);

  if (upErr) {
    // Most likely the 0003 migration hasn't been applied yet.
    const needsMigration = /column .* does not exist/i.test(upErr.message);
    return NextResponse.json(
      {
        error: needsMigration
          ? "The source-check columns aren't in the database yet — apply supabase/migrations/0003_source_check.sql, then retry."
          : upErr.message,
        ...verdict,
        persisted: false,
      },
      { status: needsMigration ? 409 : 500 },
    );
  }

  return NextResponse.json({ ...verdict, checked_at, persisted: true });
}
