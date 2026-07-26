import Link from "next/link";
import { getIntelItems, getActionCounts, getDashboardStats } from "@/lib/data";
import type { IntelStatus, IntelType } from "@/lib/types";
import { TypeBadge, StatusBadge, PriorityPill } from "./components/badges";
import { Filters } from "./components/filters";

export const dynamic = "force-dynamic";

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className={"text-2xl font-bold tabular-nums " + (tone ?? "")}>{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const type = (sp.type as IntelType | "all") ?? "all";
  const status = (sp.status as IntelStatus | "all") ?? "all";

  const [{ items, error }, counts, stats] = await Promise.all([
    getIntelItems({ type, status }),
    getActionCounts(),
    getDashboardStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intel dashboard</h1>
          <p className="text-sm text-neutral-500">
            Opportunities &amp; threats ranked by priority. Higher score = act sooner.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filters type={type ?? "all"} status={status ?? "all"} />
          <a
            href="/api/export"
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            title="Download all intel items and actions as an Excel spreadsheet"
          >
            ⬇ Export Excel
          </a>
        </div>
      </div>

      {sp.saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Saved {sp.saved} intel {Number(sp.saved) === 1 ? "item" : "items"} from your AI scan.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Intel items" value={stats.total} />
        <StatCard label="Opportunities" value={stats.opportunities} tone="text-emerald-600" />
        <StatCard label="Threats" value={stats.threats} tone="text-rose-600" />
        <StatCard label="Open actions" value={stats.openActions} tone="text-blue-600" />
      </div>

      {error ? (
        <ErrorPanel message={error} />
      ) : items.length === 0 ? (
        <EmptyState filtered={type !== "all" || status !== "all"} />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const n = counts[item.id] ?? 0;
            return (
              <li key={item.id}>
                <Link
                  href={`/intel/${item.id}`}
                  className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                >
                  <PriorityPill score={item.priority_score} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={item.type} />
                      <StatusBadge status={item.status} />
                      {item.source === "ai_scan" && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                          AI scan
                        </span>
                      )}
                      {n > 0 && (
                        <span className="text-xs text-neutral-500">
                          {n} action{n === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 truncate font-medium text-neutral-900">{item.title}</h3>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
      <h3 className="font-medium text-neutral-800">
        {filtered ? "No intel matches these filters" : "No intel items yet"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
        {filtered
          ? "Try clearing the filters, or add a new intel item."
          : "Run an AI research scan to surface opportunities and threats, or add one manually."}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link
          href="/scan"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Run AI scan
        </Link>
        <Link
          href="/intel/new"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
        >
          New intel item
        </Link>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
      <h3 className="font-medium text-rose-800">Couldn&apos;t load intel items</h3>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      <p className="mt-2 text-xs text-rose-600">
        If the database tables don&apos;t exist yet, apply the migration in{" "}
        <code>supabase/migrations</code>.
      </p>
    </div>
  );
}
