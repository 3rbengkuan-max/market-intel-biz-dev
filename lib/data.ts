import { createClient } from "@/lib/supabase/server";
import type {
  Action,
  IntelItem,
  IntelItemWithActions,
  IntelStatus,
  IntelType,
} from "@/lib/types";

export interface IntelFilters {
  type?: IntelType | "all";
  status?: IntelStatus | "all";
}

/** Dashboard list: intel items ranked by priority_score desc, then created_at desc. */
export async function getIntelItems(
  filters: IntelFilters = {},
): Promise<{ items: IntelItem[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("intel_items")
    .select("*")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) return { items: [], error: error.message };
  return { items: (data as IntelItem[]) ?? [], error: null };
}

/** Count of actions per intel item, for badges on the dashboard. */
export async function getActionCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("actions").select("intel_item_id");
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as { intel_item_id: string }[]) {
    counts[row.intel_item_id] = (counts[row.intel_item_id] ?? 0) + 1;
  }
  return counts;
}

export async function getIntelItem(
  id: string,
): Promise<{ item: IntelItemWithActions | null; error: string | null }> {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("intel_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { item: null, error: error.message };
  if (!item) return { item: null, error: null };

  const { data: actions, error: aErr } = await supabase
    .from("actions")
    .select("*")
    .eq("intel_item_id", id)
    .order("created_at", { ascending: true });
  if (aErr) return { item: null, error: aErr.message };

  return {
    item: { ...(item as IntelItem), actions: (actions as Action[]) ?? [] },
    error: null,
  };
}

export async function getDashboardStats(): Promise<{
  total: number;
  opportunities: number;
  threats: number;
  openActions: number;
}> {
  const supabase = await createClient();
  const [{ data: items }, { data: actions }] = await Promise.all([
    supabase.from("intel_items").select("type,status"),
    supabase.from("actions").select("status"),
  ]);
  const list = (items as { type: IntelType; status: IntelStatus }[]) ?? [];
  const acts = (actions as { status: string }[]) ?? [];
  return {
    total: list.length,
    opportunities: list.filter((i) => i.type === "opportunity").length,
    threats: list.filter((i) => i.type === "threat").length,
    openActions: acts.filter((a) => a.status !== "done").length,
  };
}
