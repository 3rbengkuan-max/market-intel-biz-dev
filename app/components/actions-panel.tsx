"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAction, updateActionStatus, deleteAction } from "@/app/actions";
import {
  ACTION_STATUSES,
  ACTION_TYPES,
  ASSIGNEE_ROLES,
  STATUS_LABELS,
  type Action,
} from "@/lib/types";
import { StatusBadge } from "./badges";

const input =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const label = "block text-xs font-medium text-neutral-600";

export function ActionsPanel({
  intelItemId,
  actions,
}: {
  intelItemId: string;
  actions: Action[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onCreate(formData: FormData) {
    setFormError(null);
    start(async () => {
      const res = await createAction(intelItemId, formData);
      if (!res.ok) {
        setFormError(res.error ?? "Failed to create action");
        return;
      }
      formRef.current?.reset();
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Actions <span className="text-neutral-400">({actions.length})</span>
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add action
          </button>
        )}
      </div>

      {actions.length === 0 && !showForm && (
        <p className="mt-3 text-sm text-neutral-500">
          No response actions yet. Add one to assign an owner and a due date.
        </p>
      )}

      {actions.length > 0 && (
        <ul className="mt-3 divide-y divide-neutral-100">
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} intelItemId={intelItemId} />
          ))}
        </ul>
      )}

      {showForm && (
        <form ref={formRef} action={onCreate} className="mt-4 space-y-3 rounded-md bg-neutral-50 p-4">
          {formError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
          <div>
            <label className={label} htmlFor="a-title">
              Action title <span className="text-rose-600">*</span>
            </label>
            <input id="a-title" name="title" required placeholder="e.g. Monitor competitor rollout" className={input} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="a-type">Action type</label>
              <select id="a-type" name="action_type" defaultValue="monitor" className={input}>
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="a-status">Status</label>
              <select id="a-status" name="status" defaultValue="draft" className={input}>
                {ACTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="a-name">Assignee</label>
              <input id="a-name" name="assignee_name" placeholder="e.g. Priya Nair" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="a-role">Role</label>
              <select id="a-role" name="assignee_role" defaultValue="" className={input}>
                <option value="">—</option>
                {ASSIGNEE_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="a-due">Due date</label>
              <input id="a-due" name="due_date" type="date" className={input} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="a-desc">Notes</label>
            <textarea id="a-desc" name="description" rows={2} className={input} />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save action"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              disabled={pending}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ActionRow({ action, intelItemId }: { action: Action; intelItemId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function changeStatus(next: string) {
    start(async () => {
      const res = await updateActionStatus(action.id, intelItemId, next);
      if (!res.ok) alert(res.error ?? "Failed to update");
      router.refresh();
    });
  }
  function remove() {
    start(async () => {
      const res = await deleteAction(action.id, intelItemId);
      if (!res.ok) alert(res.error ?? "Failed to delete");
      router.refresh();
    });
  }

  const overdue =
    action.due_date &&
    action.status !== "done" &&
    new Date(action.due_date) < new Date(new Date().toDateString());

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-neutral-900">{action.title}</span>
            {action.action_type && (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
                {action.action_type}
              </span>
            )}
            <StatusBadge status={action.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
            {action.assignee_name && (
              <span>
                👤 {action.assignee_name}
                {action.assignee_role ? ` · ${action.assignee_role}` : ""}
              </span>
            )}
            {action.due_date && (
              <span className={overdue ? "font-medium text-rose-600" : ""}>
                📅 due {action.due_date}
                {overdue ? " (overdue)" : ""}
              </span>
            )}
          </div>
          {action.description && (
            <p className="mt-1 text-sm text-neutral-600">{action.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={action.status}
            disabled={pending}
            onChange={(e) => changeStatus(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
          >
            {ACTION_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          {confirming ? (
            <span className="flex items-center gap-1">
              <button
                onClick={remove}
                disabled={pending}
                className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {pending ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
              >
                No
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded border border-neutral-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
              title="Delete action"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
