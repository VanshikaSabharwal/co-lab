"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Bug, ExternalLink } from "lucide-react";

type Status = "OPEN" | "IN_PROGRESS" | "FIXED" | "WONT_FIX";

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: Status;
  url: string | null;
  githubIssueUrl: string | null;
  githubIssueNo: number | null;
  createdAt: string;
  screenshot?: string | null;
  reporter?: { name: string | null; email: string | null } | false;
}

const STATUS_STYLE: Record<Status, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  FIXED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  WONT_FIX: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
const SEV_STYLE: Record<string, string> = {
  HIGH: "text-red-500",
  MEDIUM: "text-amber-500",
  LOW: "text-gray-400",
};
const STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "FIXED", "WONT_FIX"];

export default function BugList() {
  const { status: authStatus } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bug-report${scope === "all" ? "?all=1" : ""}`);
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin);
        setReports(data.reports ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (authStatus === "authenticated") load();
  }, [authStatus, load]);

  const updateStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/bug-report/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success("Status updated");
    } else {
      toast.error("Failed to update");
    }
  };

  if (authStatus === "unauthenticated") {
    return <p className="mt-10 text-center text-gray-500">Sign in to see bug reports.</p>;
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-56px)] max-w-3xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <Bug className="h-5 w-5" /> Bug Reports
        </h1>
        {isAdmin && (
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs dark:border-gray-700">
            <button
              onClick={() => setScope("mine")}
              className={`rounded-md px-3 py-1 ${scope === "mine" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500"}`}
            >
              My reports
            </button>
            <button
              onClick={() => setScope("all")}
              className={`rounded-md px-3 py-1 ${scope === "all" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500"}`}
            >
              All reports
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-400">No reports yet.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{r.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                    {r.description}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                <span>{r.category}</span>
                <span className={SEV_STYLE[r.severity]}>● {r.severity}</span>
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                {scope === "all" && r.reporter && (
                  <span>by {r.reporter.name ?? r.reporter.email}</span>
                )}
                {r.githubIssueUrl && (
                  <a href={r.githubIssueUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-blue-500 hover:underline">
                    issue #{r.githubIssueNo} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {scope === "all" && r.screenshot && (
                <img src={r.screenshot} alt="screenshot" className="mt-3 max-h-56 rounded-lg border border-gray-200 dark:border-gray-700" />
              )}

              {isAdmin && scope === "all" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(r.id, s)}
                      disabled={r.status === s}
                      className={`rounded px-2 py-1 text-[11px] transition ${
                        r.status === s
                          ? "cursor-default bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                          : "border border-gray-200 text-gray-600 hover:border-blue-400 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
