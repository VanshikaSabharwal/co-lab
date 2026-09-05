"use client";

import React from "react";
import { Folder, ChevronRight } from "lucide-react";

interface EditorBreadcrumbProps {
  /** Repo name shown as the root crumb. */
  repo: string;
  /** Active file path, e.g. "src/index.html". */
  path: string;
}

export default function EditorBreadcrumb({ repo, path }: EditorBreadcrumbProps) {
  if (!path) return null;
  const parts = path.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400"
    >
      <Folder size={13} className="shrink-0" />
      <span className="shrink-0">{repo}</span>
      {parts.map((part, i) => (
        <React.Fragment key={`${part}-${i}`}>
          <ChevronRight size={12} className="shrink-0 opacity-50" />
          <span
            className={
              i === parts.length - 1
                ? "shrink-0 font-medium text-gray-900 dark:text-gray-100"
                : "shrink-0"
            }
          >
            {part}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}
