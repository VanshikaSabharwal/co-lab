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
    <div className="flex w-64 shrink-0 flex-col rounded-md border border-gray-700/50 bg-gray-800/60">
      <div className="flex items-center gap-1 border-b border-gray-700/50 px-2 py-2">
        <input
          value={column.title}
          onChange={(e) => onRename(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
        />
        <button onClick={onDeleteColumn} className="text-gray-600 hover:text-red-400">
          <X size={14} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 ${isOver ? "bg-blue-900/20" : ""}`}
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
        className="flex items-center justify-center gap-1 border-t border-gray-700/50 py-1.5 text-xs text-gray-400 hover:bg-gray-700/40 hover:text-white"
      >
        <Plus size={12} /> Add card
      </button>
    </div>
  );
}
