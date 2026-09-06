"use client";

import { Trash2, Undo2, Loader2, AlertTriangle } from "lucide-react";

export interface TrashItem {
  id: number;
  name: string;
  path: string;
  stagedAt: string;
  expiresAt: string;
  daysLeft: number;
}

interface TrashPanelProps {
  items: TrashItem[];
  loading: boolean;
  ttlDays: number;
  restoringPath: string | null;
  onRestore: (path: string) => void;
}

/**
 * Lists files staged for deletion.
 *
 * These files are still in the repo: a staged deletion only applies when a
 * change request containing it is merged. The panel says so, because a "trash"
 * that has not actually deleted anything is otherwise confusing — and because
 * expiry here restores the file rather than destroying it.
 */
export default function TrashPanel({
  items,
  loading,
  ttlDays,
  restoringPath,
  onRestore,
}: TrashPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        Loading trash…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Trash2 size={28} className="text-gray-400" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Nothing staged for deletion
        </p>
        <p className="max-w-xs text-xs text-gray-500">
          Files you delete are staged here until a change request applies them.
        </p>
      </div>
    );
  }

  const expiring = items.filter((i) => i.daysLeft <= 1);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Trash ({items.length})
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Still in the repo — deletion applies when a change request is merged.
          Staged deletions older than {ttlDays} days are undone automatically.
        </p>
      </div>

      {expiring.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {expiring.length === 1
              ? `“${expiring[0]!.name}” expires tomorrow`
              : `${expiring.length} staged deletions expire tomorrow`}{" "}
            — they&apos;ll be restored unless a change request applies them first.
          </span>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const soon = item.daysLeft <= 1;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-800 line-through dark:text-gray-200">
                  {item.name}
                </p>
                <p className="truncate text-[11px] text-gray-500">{item.path}</p>
                <p
                  className={
                    soon
                      ? "mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                      : "mt-0.5 text-[11px] text-gray-500"
                  }
                >
                  {item.daysLeft <= 0
                    ? "Expires today"
                    : item.daysLeft === 1
                      ? "Expires in 1 day"
                      : `Expires in ${item.daysLeft} days`}
                </p>
              </div>

              <button
                onClick={() => onRestore(item.path)}
                disabled={restoringPath === item.path}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {restoringPath === item.path ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Undo2 size={13} />
                )}
                Restore
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
