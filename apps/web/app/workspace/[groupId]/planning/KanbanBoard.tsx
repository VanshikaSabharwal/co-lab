"use client";

import { DndContext, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
import KanbanColumn from "./KanbanColumn";
import type { PlanningCard, PlanningContent } from "../../lib/usePlanningBoard";

interface KanbanBoardProps {
  content: PlanningContent;
  updateContent: (updater: (prev: PlanningContent) => PlanningContent) => void;
}

export default function KanbanBoard({ content, updateContent }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    updateContent((prev) => {
      const sourceColumn = prev.columns.find((c) => c.cardIds.includes(activeId));
      if (!sourceColumn) return prev;

      let destColumn = prev.columns.find((c) => c.id === overId);
      let overCardIndex = -1;
      if (!destColumn) {
        destColumn = prev.columns.find((c) => c.cardIds.includes(overId));
        if (destColumn) overCardIndex = destColumn.cardIds.indexOf(overId);
      }
      if (!destColumn) return prev;

      const newColumns = prev.columns.map((c) => ({ ...c, cardIds: [...c.cardIds] }));
      const srcCol = newColumns.find((c) => c.id === sourceColumn.id)!;
      const dstCol = newColumns.find((c) => c.id === destColumn!.id)!;
      const fromIndex = srcCol.cardIds.indexOf(activeId);

      if (srcCol.id === dstCol.id) {
        const toIndex = overCardIndex >= 0 ? overCardIndex : srcCol.cardIds.length - 1;
        srcCol.cardIds = arrayMove(srcCol.cardIds, fromIndex, toIndex);
      } else {
        srcCol.cardIds.splice(fromIndex, 1);
        const toIndex = overCardIndex >= 0 ? overCardIndex : dstCol.cardIds.length;
        dstCol.cardIds.splice(toIndex, 0, activeId);
      }

      return { ...prev, columns: newColumns };
    });
  };

  const addColumn = () => {
    updateContent((prev) => ({
      ...prev,
      columns: [...prev.columns, { id: uuid(), title: "New column", cardIds: [] }],
    }));
  };

  const deleteColumn = (columnId: string) => {
    updateContent((prev) => {
      const column = prev.columns.find((c) => c.id === columnId);
      if (!column) return prev;
      const cards = { ...prev.cards };
      column.cardIds.forEach((id) => delete cards[id]);
      return { ...prev, columns: prev.columns.filter((c) => c.id !== columnId), cards };
    });
  };

  const renameColumn = (columnId: string, title: string) => {
    updateContent((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }));
  };

  const addCard = (columnId: string) => {
    const id = uuid();
    updateContent((prev) => ({
      ...prev,
      cards: { ...prev.cards, [id]: { id, title: "" } },
      columns: prev.columns.map((c) => (c.id === columnId ? { ...c, cardIds: [...c.cardIds, id] } : c)),
    }));
  };

  const changeCardTitle = (cardId: string, title: string) => {
    updateContent((prev) => ({
      ...prev,
      cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId]!, title } },
    }));
  };

  const deleteCard = (cardId: string) => {
    updateContent((prev) => {
      const cards = { ...prev.cards };
      delete cards[cardId];
      return {
        ...prev,
        cards,
        columns: prev.columns.map((c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== cardId) })),
        milestones: prev.milestones.map((m) => ({ ...m, cardIds: m.cardIds.filter((id) => id !== cardId) })),
      };
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {content.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={column.cardIds.map((id) => content.cards[id]).filter((c): c is PlanningCard => Boolean(c))}
            onRename={(title) => renameColumn(column.id, title)}
            onDeleteColumn={() => deleteColumn(column.id)}
            onAddCard={() => addCard(column.id)}
            onChangeCardTitle={changeCardTitle}
            onDeleteCard={deleteCard}
          />
        ))}
        <button
          onClick={addColumn}
          className="flex h-10 w-40 shrink-0 items-center justify-center gap-1 rounded-md border border-dashed border-gray-700 text-xs text-gray-500 hover:border-blue-600/60 hover:text-white"
        >
          <Plus size={14} /> Add column
        </button>
      </div>
    </DndContext>
  );
}
