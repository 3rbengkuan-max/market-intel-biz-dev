import Link from "next/link";
import type { IntelItem } from "@/lib/types";
import { INTEL_STATUSES, INTEL_TYPES, STATUS_LABELS } from "@/lib/types";

const label = "block text-sm font-medium text-neutral-700";
const input =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

/**
 * Presentational fields for the intel create/edit form. Wrap in a
 * <form action={serverAction}> in the page.
 */
export function IntelFormFields({
  item,
  submitLabel,
  cancelHref,
  error,
}: {
  item?: IntelItem;
  submitLabel: string;
  cancelHref: string;
  error?: string;
}) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div>
        <label className={label} htmlFor="title">
          Title <span className="text-rose-600">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={item?.title ?? ""}
          placeholder="e.g. Competitor acquires reagent supplier"
          className={input}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="type">
            Type <span className="text-rose-600">*</span>
          </label>
          <select id="type" name="type" defaultValue={item?.type ?? "opportunity"} className={input}>
            {INTEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "opportunity" ? "Opportunity" : "Threat"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={item?.status ?? "new"} className={input}>
            {INTEL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={item?.description ?? ""}
          placeholder="What's happening and why it matters…"
          className={input}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="source_url">
            Source URL
          </label>
          <input
            id="source_url"
            name="source_url"
            type="url"
            defaultValue={item?.source_url ?? ""}
            placeholder="https://…"
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="confidence">
            Confidence (0–1)
          </label>
          <input
            id="confidence"
            name="confidence"
            type="number"
            step="0.01"
            min="0"
            max="1"
            defaultValue={item?.confidence ?? ""}
            placeholder="0.80"
            className={input}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Affects priority score (+15 when above 0.8).
          </p>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="recommendation">
          Recommendation
        </label>
        <textarea
          id="recommendation"
          name="recommendation"
          rows={3}
          defaultValue={item?.recommendation ?? ""}
          placeholder="Suggested response…"
          className={input}
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
