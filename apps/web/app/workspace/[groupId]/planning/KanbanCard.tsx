"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import type { PlanningCard } from "../../lib/usePlanningBoard";

interface KanbanCardProps {
  card: PlanningCard;
  onChangeTitle: (title: string) => void;
  onDelete: () => void;
}

export default function KanbanCard({ card, onChangeTitle, onDelete }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      className="group flex items-start gap-1 rounded border border-gray-700 bg-gray-900/80 px-2 py-1.5 text-sm text-gray-200 shadow-sm"
    >
      <input
        value={card.title}
        onChange={(e) => onChangeTitle(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="nodrag flex-1 bg-transparent outline-none"
        placeholder="Untitled task"
      />
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        className="text-gray-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
      >
        <X size={12} />
      </button>
    </div>
  );
}
