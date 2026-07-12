"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Brain, KanbanSquare, Database, LayoutTemplate } from "lucide-react";

interface WorkspaceHubProps {
  groupId: string;
}

const TOOLS = [
  {
    slug: "mind-map",
    title: "Mind Map",
    description: "Freeform brainstorming canvas",
    icon: Brain,
  },
  {
    slug: "planning",
    title: "Planning & Milestones",
    description: "Kanban board and milestone timeline",
    icon: KanbanSquare,
  },
  {
    slug: "db-schema",
    title: "DB Schema Design",
    description: "Visual ERD — tables, columns, relations",
    icon: Database,
  },
  {
    slug: "ui-design",
    title: "UI/UX Design",
    description: "Wireframe canvas for screen mockups",
    icon: LayoutTemplate,
  },
] as const;

function relativeTime(iso: string | null) {
  if (!iso) return "Not started yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export default function WorkspaceHub({ groupId }: WorkspaceHubProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [updatedAt, setUpdatedAt] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!userId) return;
    TOOLS.forEach(({ slug }) => {
      fetch(`/api/workspace/${groupId}/${slug}?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => setUpdatedAt((prev) => ({ ...prev, [slug]: data.updatedAt ?? null })))
        .catch(() => {});
    });
  }, [groupId, userId]);

  return (
    <div className="min-h-screen bg-gray-900 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href={`/group/${groupId}`} className="text-sm text-gray-400 hover:text-white">
          ← Back to group
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Workspace</h1>
        <p className="mt-1 text-sm text-gray-400">
          All the thinking and planning for this project, in one place.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TOOLS.map(({ slug, title, description, icon: Icon }) => (
            <Link
              key={slug}
              href={`/workspace/${groupId}/${slug}`}
              className="group rounded-lg border border-gray-700/50 bg-gray-800/80 p-5 transition-colors hover:border-blue-600/60 hover:bg-gray-800"
            >
              <Icon className="text-blue-500" size={28} />
              <h2 className="mt-3 font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-gray-400">{description}</p>
              <p className="mt-4 text-xs text-gray-500">{relativeTime(updatedAt[slug] ?? null)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
