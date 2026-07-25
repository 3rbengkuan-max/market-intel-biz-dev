import { STATUS_LABELS } from "@/lib/types";

export function TypeBadge({ type }: { type: string }) {
  const isOpp = type === "opportunity";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
        (isOpp
          ? "bg-emerald-100 text-emerald-800"
          : "bg-rose-100 text-rose-800")
      }
    >
      {isOpp ? "▲ Opportunity" : "▼ Threat"}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-neutral-100 text-neutral-700",
  triaged: "bg-amber-100 text-amber-800",
  acting: "bg-blue-100 text-blue-800",
  closed: "bg-neutral-200 text-neutral-500",
  draft: "bg-neutral-100 text-neutral-700",
  planned: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (STATUS_COLORS[status] ?? "bg-neutral-100 text-neutral-700")
      }
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityPill({ score }: { score: number }) {
  let color = "bg-neutral-100 text-neutral-700";
  if (score >= 85) color = "bg-rose-600 text-white";
  else if (score >= 70) color = "bg-orange-500 text-white";
  else if (score >= 55) color = "bg-amber-400 text-amber-950";
  return (
    <span
      title="Priority score (0–100)"
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold tabular-nums " +
        color
      }
    >
      {Math.round(score)}
    </span>
  );
}
