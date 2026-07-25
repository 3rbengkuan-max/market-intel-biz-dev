"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TYPE_OPTS = [
  { v: "all", label: "All types" },
  { v: "opportunity", label: "Opportunities" },
  { v: "threat", label: "Threats" },
];
const STATUS_OPTS = [
  { v: "all", label: "All statuses" },
  { v: "new", label: "New" },
  { v: "triaged", label: "Triaged" },
  { v: "acting", label: "Acting" },
  { v: "closed", label: "Closed" },
];

export function Filters({ type, status }: { type: string; status: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const selectCls =
    "rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={type} onChange={(e) => update("type", e.target.value)} className={selectCls}>
        {TYPE_OPTS.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        className={selectCls}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      {(type !== "all" || status !== "all") && (
        <button
          onClick={() => router.push("/")}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
