import Link from "next/link";
import { notFound } from "next/navigation";
import { getIntelItem } from "@/lib/data";
import { TypeBadge, StatusBadge, PriorityPill, SourceCheckBadge } from "@/app/components/badges";
import { VerifySource } from "@/app/components/verify-source";
import { IntelStatusControl } from "@/app/components/intel-status-control";
import { DeleteIntelButton } from "@/app/components/delete-intel-button";
import { ActionsPanel } from "@/app/components/actions-panel";

export const dynamic = "force-dynamic";

export default async function IntelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { item, error } = await getIntelItem(id);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }
  if (!item) notFound();

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <PriorityPill score={item.priority_score} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {item.source === "ai_scan" ? "AI scan" : item.source}
              </span>
              {typeof item.confidence === "number" && (
                <span className="text-xs text-neutral-500">
                  confidence {(item.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{item.title}</h1>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <IntelStatusControl id={item.id} status={item.status} />
          <div className="flex items-center gap-2">
            <Link
              href={`/intel/${item.id}/edit`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
            >
              Edit
            </Link>
            <DeleteIntelButton id={item.id} title={item.title} />
          </div>
        </div>

        {item.description && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Description
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{item.description}</p>
          </div>
        )}

        {item.recommendation && (
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-500">
              Recommended response
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-blue-900">{item.recommendation}</p>
          </div>
        )}

        {item.source_url && (
          <div className="mt-4">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              🔗 View source
            </a>
          </div>
        )}

        <div className="mt-4">
          <VerifySource
            id={item.id}
            hasSource={Boolean(item.source_url)}
            status={item.source_check_status}
            notes={item.source_check_notes}
            checkedAt={item.source_checked_at}
          />
        </div>
      </div>

      <ActionsPanel intelItemId={item.id} actions={item.actions} />
    </div>
  );
}
