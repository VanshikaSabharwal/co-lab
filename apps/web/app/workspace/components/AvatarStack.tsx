"use client";

import React from "react";
import Avatar, { type AvatarUser } from "./Avatar";
import { cn } from "../../lib/utils";

interface AvatarStackProps {
  users: AvatarUser[];
  /** Faces shown before collapsing into a +N chip. */
  max?: number;
  size?: number;
  className?: string;
}

/**
 * Overlapping faces with a +N overflow chip.
 *
 * The previous presence bar mapped every id with no cap, so a large group
 * pushed the header out of shape.
 */
export default function AvatarStack({ users, max = 4, size = 28, className }: AvatarStackProps) {
  if (users.length === 0) return null;

  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {shown.map((user) => (
        <Avatar key={user.id} user={user} size={size} ring />
      ))}
      {overflow > 0 && (
        <span
          style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.34)) }}
          // Names the hidden people, so the chip isn't a dead end.
          title={users.slice(max).map((u) => u.name ?? "Unknown").join(", ")}
          className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ring-2 ring-white dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-900"
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
