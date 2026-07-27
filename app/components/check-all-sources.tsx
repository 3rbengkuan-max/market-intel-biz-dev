"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONCURRENCY = 4;

export function CheckAllSources({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<number | null>(null);

  const total = ids.length;

  async function run() {
    if (running || total === 0) return;
    if (
      !window.confirm(
        `Check the source of ${total} intel ${total === 1 ? "item" : "items"} against its intel? ` +
          `This fetches each page and uses Claude, so it may take a couple of minutes.`,
      )
    ) {
      return;
    }
    setRunning(true);
    setError(null);
    setFinished(null);
    setDone(0);

    const queue = [...ids];
    let stop = false;

    async function worker() {
      while (queue.length && !stop) {
        const id = queue.shift();
        if (!id) break;
        try {
          const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const data = await res.json().catch(() => ({}));
          // Stop the whole run only for setup problems (no key / missing columns).
          if (data.noKey || res.status === 409) {
            stop = true;
            setError(data.error ?? "Source checking isn't fully configured.");
            return;
          }
        } catch {
          /* per-item network error — skip and continue */
        } finally {
          setDone((d) => d + 1);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));

    setRunning(false);
    if (!stop) setFinished(total);
    router.refresh();
  }

  const btnCls =
    "inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <button onClick={run} disabled={running || total === 0} className={btnCls} title="Check every source URL against its intel item">
        {running ? `Checking ${done}/${total}…` : `✓ Check all sources${total ? ` (${total})` : ""}`}
      </button>
      {finished !== null && !running && (
        <span className="text-xs text-emerald-700">Checked {finished} sources</span>
      )}
      {error && <span className="text-xs text-amber-700">{error}</span>}
    </div>
  );
}
