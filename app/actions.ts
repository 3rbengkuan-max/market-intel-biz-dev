"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computePriorityScore } from "@/lib/scoring";
import type { IntelType } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function str(form: FormData, key: string): string {
  return (form.get(key) as string | null)?.trim() ?? "";
}
function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v.length ? v : null;
}

/** Recompute and persist priority_score for one intel item from its current fields + action count. */
async function recomputeScore(supabase: any, intelItemId: string) {
  const { data: item } = await supabase
    .from("intel_items")
    .select("type,confidence,source_url")
    .eq("id", intelItemId)
    .maybeSingle();
  if (!item) return;
  const { count } = await supabase
    .from("actions")
    .select("id", { count: "exact", head: true })
    .eq("intel_item_id", intelItemId);
  const score = computePriorityScore({
    type: item.type as IntelType,
    confidence: item.confidence,
    source_url: item.source_url,
    actionCount: count ?? 0,
  });
  await supabase.from("intel_items").update({ priority_score: score }).eq("id", intelItemId);
}

// ── Intel items ───────────────────────────────────────────────────────────────

export async function createIntelItem(form: FormData): Promise<void> {
  const supabase = await createClient();
  const title = str(form, "title");
  const type = str(form, "type") as IntelType;
  if (!title || (type !== "opportunity" && type !== "threat")) {
    redirect("/intel/new?error=" + encodeURIComponent("Title and a valid type are required."));
  }
  const confidenceRaw = optStr(form, "confidence");
  const confidence = confidenceRaw !== null ? Number(confidenceRaw) : null;
  const source_url = optStr(form, "source_url");

  const priority_score = computePriorityScore({ type, confidence, source_url, actionCount: 0 });

  const { data, error } = await supabase
    .from("intel_items")
    .insert({
      title,
      type,
      description: optStr(form, "description"),
      source_url,
      recommendation: optStr(form, "recommendation"),
      confidence: confidence !== null && !Number.isNaN(confidence) ? confidence : null,
      status: str(form, "status") || "new",
      source: "manual",
      review_status: "reviewed",
      priority_score,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/intel/new?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/");
  redirect(`/intel/${data!.id}`);
}

export async function updateIntelItem(id: string, form: FormData): Promise<void> {
  const supabase = await createClient();
  const title = str(form, "title");
  const type = str(form, "type") as IntelType;
  if (!title || (type !== "opportunity" && type !== "threat")) {
    redirect(`/intel/${id}/edit?error=` + encodeURIComponent("Title and a valid type are required."));
  }
  const confidenceRaw = optStr(form, "confidence");
  const confidence = confidenceRaw !== null ? Number(confidenceRaw) : null;

  const { error } = await supabase
    .from("intel_items")
    .update({
      title,
      type,
      description: optStr(form, "description"),
      source_url: optStr(form, "source_url"),
      recommendation: optStr(form, "recommendation"),
      confidence: confidence !== null && !Number.isNaN(confidence) ? confidence : null,
      status: str(form, "status") || "new",
    })
    .eq("id", id);

  if (error) {
    redirect(`/intel/${id}/edit?error=` + encodeURIComponent(error.message));
  }
  await recomputeScore(supabase, id);
  revalidatePath("/");
  revalidatePath(`/intel/${id}`);
  redirect(`/intel/${id}`);
}

export async function updateIntelStatus(id: string, status: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("intel_items").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath(`/intel/${id}`);
  return { ok: true };
}

export async function deleteIntelItem(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("intel_items").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}

// ── Actions (response tasks) ──────────────────────────────────────────────────

export async function createAction(intelItemId: string, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const title = str(form, "title");
  if (!title) return { ok: false, error: "Action title is required." };

  const { error } = await supabase.from("actions").insert({
    intel_item_id: intelItemId,
    title,
    description: optStr(form, "description"),
    action_type: optStr(form, "action_type"),
    status: str(form, "status") || "draft",
    assignee_name: optStr(form, "assignee_name"),
    assignee_role: optStr(form, "assignee_role"),
    due_date: optStr(form, "due_date"),
  });
  if (error) return { ok: false, error: error.message };

  await recomputeScore(supabase, intelItemId);
  revalidatePath("/");
  revalidatePath(`/intel/${intelItemId}`);
  return { ok: true };
}

export async function updateActionStatus(
  actionId: string,
  intelItemId: string,
  status: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("actions").update({ status }).eq("id", actionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intel/${intelItemId}`);
  return { ok: true };
}

export async function deleteAction(actionId: string, intelItemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("actions").delete().eq("id", actionId);
  if (error) return { ok: false, error: error.message };
  await recomputeScore(supabase, intelItemId);
  revalidatePath("/");
  revalidatePath(`/intel/${intelItemId}`);
  return { ok: true };
}

// ── AI scan: save reviewed drafts ─────────────────────────────────────────────

export interface ScanDraftInput {
  type: IntelType;
  title: string;
  description: string;
  source_url: string;
  confidence: number | null;
  recommendation: string;
  priority_score?: number;
}

export async function saveScanItems(
  runId: string | null,
  drafts: ScanDraftInput[],
): Promise<ActionResult & { savedCount?: number }> {
  const supabase = await createClient();
  if (!drafts.length) return { ok: false, error: "No items selected to save." };

  const rows = drafts.map((d) => ({
    title: d.title,
    type: d.type,
    description: d.description || null,
    source_url: d.source_url || null,
    recommendation: d.recommendation || null,
    confidence: d.confidence,
    status: "new",
    source: "ai_scan" as const,
    review_status: "unreviewed" as const,
    research_run_id: runId,
    priority_score: computePriorityScore({
      type: d.type,
      confidence: d.confidence,
      source_url: d.source_url,
      actionCount: 0,
    }),
  }));

  const { error } = await supabase.from("intel_items").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true, savedCount: rows.length };
}

// ── Feed inbox: approve / dismiss ─────────────────────────────────────────────

export async function approveFeedItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("intel_items")
    .update({ review_status: "reviewed" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/feed");
  return { ok: true };
}

export async function dismissFeedItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("intel_items")
    .update({ review_status: "rejected" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  return { ok: true };
}

// ── Watch-list management ─────────────────────────────────────────────────────

export async function addWatchTopic(form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const topic = str(form, "topic");
  if (!topic) return { ok: false, error: "Enter a topic to watch." };
  const { error } = await supabase
    .from("watchlist")
    .insert({ topic, category: optStr(form, "category") });
  if (error) {
    return {
      ok: false,
      error: /duplicate key/i.test(error.message) ? "That topic is already on the watch-list." : error.message,
    };
  }
  revalidatePath("/feed");
  return { ok: true };
}

export async function toggleWatchTopic(id: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist").update({ enabled }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  return { ok: true };
}

export async function deleteWatchTopic(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  return { ok: true };
}
