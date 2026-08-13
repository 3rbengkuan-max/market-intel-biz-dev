"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { approveFeedItem, dismissFeedItem } from "@/app/actions";
import { TypeBadge, SourceCheckBadge } from "./badges";
import type { IntelItem } from "@/lib/types";

export function FeedCard({ item }: { item: IntelItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);

  function act(fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    setGone(true);
    start(async () => {
      const res = await fn(item.id);
      if (!res.ok) {
        setGone(false);
        alert(res.error ?? "Action failed");
        return;
      }
      router.refresh();
    });
  }

  if (gone) return null;

  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={item.type} />
        {item.category && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
            {item.category}
          </span>
        )}
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
          from feed
        </span>
        <SourceCheckBadge status={item.source_check_status} />
      </div>

      <h3 className="mt-2 font-medium text-neutral-900">{item.title}</h3>
      {item.description && (
        <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
      )}

      {item.source_check_notes && (
        <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
          ✓ Verified: {item.source_check_notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => act(approveFeedItem)}
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Approve → dashboard
        </button>
        <button
          onClick={() => act(dismissFeedItem)}
          disabled={pending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
        >
          Dismiss
        </button>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            🔗 Source
          </a>
        )}
        <Link href={`/intel/${item.id}`} className="text-sm text-neutral-500 hover:underline">
          Open
        </Link>
      </div>
    </li>
  );
}
