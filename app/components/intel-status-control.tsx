"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateIntelStatus } from "@/app/actions";
import { INTEL_STATUSES, STATUS_LABELS } from "@/lib/types";

export function IntelStatusControl({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onChange(next: string) {
    start(async () => {
      const res = await updateIntelStatus(id, next);
      if (!res.ok) alert(res.error ?? "Failed to update status");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-neutral-500">Status</span>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm disabled:opacity-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {INTEL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
