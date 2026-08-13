"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWatchTopic, toggleWatchTopic, deleteWatchTopic } from "@/app/actions";
import type { Watchlist } from "@/lib/types";

const CATEGORIES = ["Competitor & M&A", "Funding & grants", "Regulatory", "Tenders / RFPs"];

export function WatchlistManager({ topics }: { topics: Watchlist[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const enabledCount = topics.filter((t) => t.enabled).length;

  function onAdd(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await addWatchTopic(formData);
      if (!res.ok) {
        setError(res.error ?? "Failed to add topic");
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  function toggle(id: string, enabled: boolean) {
    start(async () => {
      await toggleWatchTopic(id, enabled);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteWatchTopic(id);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-semibold">
          Watch-list{" "}
          <span className="font-normal text-neutral-400">
            ({enabledCount} of {topics.length} active)
          </span>
        </span>
        <span className="text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <ul className="divide-y divide-neutral-100">
            {topics.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  disabled={pending}
                  onChange={(e) => toggle(t.id, e.target.checked)}
                  className="mt-1 h-4 w-4"
                  title={t.enabled ? "Enabled — click to pause" : "Paused — click to enable"}
                />
                <div className="min-w-0 flex-1">
                  <p className={"text-sm " + (t.enabled ? "text-neutral-800" : "text-neutral-400 line-through")}>
                    {t.topic}
                  </p>
                  {t.category && <p className="text-xs text-neutral-400">{t.category}</p>}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  disabled={pending}
                  title="Remove topic"
                  className="rounded px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </button>
              </li>
            ))}
            {topics.length === 0 && (
              <li className="py-2 text-sm text-neutral-500">No watch topics yet — add one below.</li>
            )}
          </ul>

          <form ref={formRef} action={onAdd} className="flex flex-col gap-2 rounded-md bg-neutral-50 p-3 sm:flex-row">
            <input
              name="topic"
              required
              placeholder="Add a topic to watch, e.g. CRISPR reagent licensing deals"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              name="category"
              defaultValue=""
              className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
            >
              <option value="">Category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {error && <p className="text-xs text-amber-700">{error}</p>}
        </div>
      )}
    </section>
  );
}
