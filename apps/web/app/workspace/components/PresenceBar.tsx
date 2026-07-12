"use client";

const COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function colorFor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

interface PresenceBarProps {
  userIds: string[];
  currentUserId?: string;
}

export default function PresenceBar({ userIds, currentUserId }: PresenceBarProps) {
  if (userIds.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {userIds.map((id) => (
        <div
          key={id}
          title={id === currentUserId ? "You" : id}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-900 text-[10px] font-semibold text-white ${colorFor(id)}`}
        >
          {id.slice(0, 2).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
