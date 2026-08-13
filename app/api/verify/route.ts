import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySourceAlignment } from "@/lib/llm";
import type { SourceCheckStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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

  const url = (item.source_url as string | null)?.trim() ?? "";
  let verdict: { status: SourceCheckStatus; notes: string };

  try {
    if (!url) {
      verdict = { status: "unreachable", notes: "No source URL is set for this item." };
    } else if (!isHttpUrl(url)) {
      verdict = { status: "unreachable", notes: "The source URL is not a valid http(s) address." };
    } else {
      verdict = await verifySourceAlignment(url, {
        title: item.title as string,
        description: item.description as string | null,
      });
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
