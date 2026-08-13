"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface RefreshResult {
  posted: { title: string }[];
  filtered: { title: string; url: string; reason: string }[];
  counts: { found: number; posted: number; filtered: number; duplicates: number };
}

export function FeedRefresh() {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [, start] = useTransition();

  async function refresh() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/feed/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: focus.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The feed refresh failed.");
        return;
      }
      setResult(data as RefreshResult);
      start(() => router.refresh());
    } catch {
      setError("Network error running the feed refresh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Optional focus for this run, e.g. EU IVDR, APAC distributors…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={refresh}
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Searching & verifying…" : "⟳ Refresh feed"}
        </button>
      </div>

      {busy && (
        <p className="mt-2 text-xs text-neutral-500">
          Searching the web across your watch-list, then verifying each source before posting — this
          takes up to a minute.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
            Found {result.counts.found} · <strong>{result.counts.posted} posted</strong> ·{" "}
            {result.counts.filtered} filtered out · {result.counts.duplicates} duplicates skipped.
          </div>
          {result.filtered.length > 0 && (
            <details className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
              <summary className="cursor-pointer text-neutral-600">
                {result.filtered.length} filtered out (source not verified)
              </summary>
              <ul className="mt-2 space-y-1.5 text-xs text-neutral-500">
                {result.filtered.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium text-neutral-700">{f.title}</span> — {f.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.counts.posted === 0 && result.filtered.length === 0 && (
            <p className="text-neutral-500">
              Nothing new this run — no fresh, verifiable items matched your watch-list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
