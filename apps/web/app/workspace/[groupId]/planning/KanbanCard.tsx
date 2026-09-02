"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
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
      className="group flex items-center gap-1 rounded border border-gray-200 bg-white px-1 py-1.5 text-sm text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-200"
    >
      {/* Drag lives on this grip alone. Spreading the listeners on the card root
          made every touch on the text field ambiguous between typing, dragging
          and scrolling. */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder task"
        className="shrink-0 cursor-grab touch-none p-1 text-gray-400 active:cursor-grabbing dark:text-gray-600"
      >
        <GripVertical size={14} />
      </button>
      <input
        value={card.title}
        onChange={(e) => onChangeTitle(e.target.value)}
        className="min-w-0 flex-1 bg-transparent outline-none"
        placeholder="Untitled task"
      />
      <button
        onClick={onDelete}
        aria-label="Delete task"
        // Always visible on touch — hover-to-reveal is unreachable there.
        className="shrink-0 p-1 text-gray-400 hover:text-red-500 focus:opacity-100 dark:text-gray-600 dark:hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
