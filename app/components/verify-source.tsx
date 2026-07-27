"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SourceCheckBadge } from "./badges";
import { SOURCE_CHECK_LABELS, type SourceCheckStatus } from "@/lib/types";

export function VerifySource({
  id,
  hasSource,
  status,
  notes,
  checkedAt,
}: {
  id: string;
  hasSource: boolean;
  status?: SourceCheckStatus | null;
  notes?: string | null;
  checkedAt?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local optimistic copy so the result shows immediately after a check.
  const [local, setLocal] = useState<{
    status: SourceCheckStatus;
    notes: string | null;
    checkedAt: string | null;
  } | null>(null);

  const current = local ?? {
    status: (status ?? "unchecked") as SourceCheckStatus,
    notes: notes ?? null,
    checkedAt: checkedAt ?? null,
  };

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok && !data.status) {
        setError(data.error ?? "The source check failed.");
        return;
      }
      setLocal({
        status: data.status as SourceCheckStatus,
        notes: data.notes ?? null,
        checkedAt: data.checked_at ?? new Date().toISOString(),
      });
      if (data.persisted) start(() => router.refresh());
      if (data.error) setError(data.error);
    } catch {
      setError("Network error running the source check.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Source check
          </h3>
          <SourceCheckBadge status={current.status} />
        </div>
        <button
          onClick={run}
          disabled={busy || pending || !hasSource}
          title={hasSource ? "Fetch the source and check it supports this intel" : "Add a source URL first"}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Checking…" : current.status === "unchecked" ? "Verify source" : "Re-check"}
        </button>
      </div>

      {!hasSource && (
        <p className="mt-2 text-sm text-neutral-500">
          No source URL on this item — add one to check it against the intel.
        </p>
      )}

      {current.notes && (
        <p className="mt-2 text-sm text-neutral-700">
          <span className="font-medium">{SOURCE_CHECK_LABELS[current.status]}:</span>{" "}
          {current.notes}
        </p>
      )}

      {current.checkedAt && (
        <p className="mt-1 text-xs text-neutral-400">
          Checked {new Date(current.checkedAt).toLocaleString()}
        </p>
      )}

      {error && (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}
