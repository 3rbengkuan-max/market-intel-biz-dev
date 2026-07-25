"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveScanItems, type ScanDraftInput } from "@/app/actions";
import type { IntelType } from "@/lib/types";

interface Draft extends ScanDraftInput {
  _selected: boolean;
}

const EXAMPLES = [
  "competitor acquisitions in reagents",
  "new cell therapy reagent regulations in EU",
  "NIH funding trends for antibody research",
  "biosimilar market shifts affecting assay kits",
];

export function ScanClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noKey, setNoKey] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [saving, startSave] = useTransition();

  async function runScan(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setNoKey(false);
    setDrafts(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The scan failed.");
        setNoKey(Boolean(data.noKey));
        return;
      }
      setRunId(data.runId ?? null);
      setDrafts(
        (data.items as ScanDraftInput[]).map((it) => ({ ...it, _selected: true })),
      );
    } catch {
      setError("Network error running the scan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(i: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev && prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function save() {
    if (!drafts) return;
    const selected = drafts
      .filter((d) => d._selected)
      .map(({ _selected, ...rest }) => rest as ScanDraftInput);
    if (selected.length === 0) {
      setError("Select at least one item to save.");
      return;
    }
    startSave(async () => {
      const res = await saveScanItems(runId, selected);
      if (!res.ok) {
        setError(res.error ?? "Failed to save.");
        return;
      }
      router.push(`/?saved=${res.savedCount ?? selected.length}`);
    });
  }

  const selectedCount = drafts?.filter((d) => d._selected).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">AI research scan</h1>
        <p className="text-sm text-neutral-500">
          Enter a topic. The AI surfaces 3–5 opportunities and threats as draft cards — review,
          edit, and save the ones worth tracking.
        </p>
      </div>

      <form onSubmit={runScan} className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. competitor acquisitions in reagents"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Run scan"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuery(ex)}
              className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {loading && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
          <p className="mt-3 text-sm text-neutral-500">
            Scanning sources and drafting intel items…
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">{error}</p>
          <div className="mt-3 flex gap-2">
            {!noKey && (
              <button
                onClick={() => runScan()}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
              >
                Retry
              </button>
            )}
            <Link
              href="/intel/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add intel manually
            </Link>
          </div>
        </div>
      )}

      {drafts && drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {drafts.length} draft{drafts.length === 1 ? "" : "s"} · {selectedCount} selected
            </h2>
            <button
              onClick={save}
              disabled={saving || selectedCount === 0}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${selectedCount} to dashboard`}
            </button>
          </div>

          {drafts.map((d, i) => (
            <DraftCard key={i} draft={d} onChange={(patch) => updateDraft(i, patch)} />
          ))}

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving || selectedCount === 0}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${selectedCount} to dashboard`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const input =
    "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  return (
    <div
      className={
        "rounded-lg border bg-white p-4 " +
        (draft._selected ? "border-emerald-300 ring-1 ring-emerald-100" : "border-neutral-200 opacity-70")
      }
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={draft._selected}
          onChange={(e) => onChange({ _selected: e.target.checked })}
          className="mt-1 h-4 w-4"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={draft.type}
              onChange={(e) => onChange({ type: e.target.value as IntelType })}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            >
              <option value="opportunity">Opportunity</option>
              <option value="threat">Threat</option>
            </select>
            <span className="text-xs text-neutral-400">
              priority {draft.priority_score} · confidence{" "}
              {draft.confidence != null ? `${Math.round(draft.confidence * 100)}%` : "—"}
            </span>
          </div>
          <input
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={input + " font-medium"}
            placeholder="Title"
          />
          <textarea
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            className={input}
            placeholder="Description"
          />
          <input
            value={draft.recommendation}
            onChange={(e) => onChange({ recommendation: e.target.value })}
            className={input}
            placeholder="Recommendation"
          />
          <input
            value={draft.source_url}
            onChange={(e) => onChange({ source_url: e.target.value })}
            className={input + " text-blue-700"}
            placeholder="Source URL (optional)"
          />
        </div>
      </div>
    </div>
  );
}
