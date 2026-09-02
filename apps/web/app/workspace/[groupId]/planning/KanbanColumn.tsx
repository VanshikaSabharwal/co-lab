"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import KanbanCard from "./KanbanCard";
import type { PlanningCard, PlanningColumn } from "../../lib/usePlanningBoard";

interface KanbanColumnProps {
  column: PlanningColumn;
  cards: PlanningCard[];
  onRename: (title: string) => void;
  onDeleteColumn: () => void;
  onAddCard: () => void;
  onChangeCardTitle: (cardId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
}

export default function KanbanColumn({
  column,
  cards,
  onRename,
  onDeleteColumn,
  onAddCard,
  onChangeCardTitle,
  onDeleteCard,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-[85vw] max-w-xs shrink-0 snap-start flex-col rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-gray-800/60 md:w-64 md:max-w-none">
      <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-2 dark:border-gray-700/50">
        <input
          value={column.title}
          onChange={(e) => onRename(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
        />
        <button onClick={onDeleteColumn} className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400">
          <X size={14} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 ${isOver ? "bg-blue-100/60 dark:bg-blue-900/20" : ""}`}
        style={{ minHeight: 80 }}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onChangeTitle={(title) => onChangeCardTitle(card.id, title)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </SortableContext>
      </div>
      <button
        onClick={onAddCard}
        className="flex items-center justify-center gap-1 border-t border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700/40 dark:hover:text-white"
      >
        <Plus size={12} /> Add card
      </button>
    </div>
  );
}
