"use client";

import React from "react";
import Image from "next/image";
import { cn } from "../../lib/utils";

/**
 * A user's photo, falling back to their initials.
 *
 * Replaces four inline duplications of the same markup, and fixes the previous
 * presence display which rendered the first two characters of a raw cuid.
 */

const FALLBACK_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

/** Stable per-user colour, so the same person keeps the same tint. */
export function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]!;
}

/** "Ada Lovelace" → "AL"; "ada@x.com" → "A". Never a slice of the user id. */
export function initialsFor(name: string | null | undefined, fallback = "?"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export interface AvatarUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface AvatarProps {
  user: AvatarUser;
  size?: number;
  className?: string;
  /** Ring colour matching the surface behind it, for overlapping stacks. */
  ring?: boolean;
  title?: string;
}

export default function Avatar({ user, size = 28, className, ring, title }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const label = title ?? user.name ?? "Unknown user";
  const showImage = user.image && !failed;

  return (
    <span
      title={label}
      aria-label={label}
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        ring && "ring-2 ring-white dark:ring-gray-900",
        !showImage && colorFor(user.id),
        className,
      )}
    >
      {showImage ? (
        <Image
          src={user.image!}
          alt={label}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          // A dead or unreachable avatar URL falls back to initials rather
          // than leaving a broken image.
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-semibold leading-none text-white"
          style={{ fontSize: Math.max(9, Math.round(size * 0.36)) }}
        >
          {initialsFor(user.name)}
        </span>
      )}
    </span>
  );
}
