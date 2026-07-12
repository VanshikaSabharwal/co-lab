"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { v4 as uuid } from "uuid";
import type { PlanningContent } from "../../lib/usePlanningBoard";

interface MilestoneTimelineProps {
  content: PlanningContent;
  updateContent: (updater: (prev: PlanningContent) => PlanningContent) => void;
}

export default function MilestoneTimeline({ content, updateContent }: MilestoneTimelineProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const allCards = Object.values(content.cards);
  const sorted = [...content.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const addMilestone = () => {
    if (!newTitle.trim() || !newDueDate) return;
    updateContent((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { id: uuid(), title: newTitle.trim(), dueDate: newDueDate, cardIds: [] }],
    }));
    setNewTitle("");
    setNewDueDate("");
  };

  const deleteMilestone = (id: string) => {
    updateContent((prev) => ({ ...prev, milestones: prev.milestones.filter((m) => m.id !== id) }));
  };

  const toggleCard = (milestoneId: string, cardId: string) => {
    updateContent((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              cardIds: m.cardIds.includes(cardId)
                ? m.cardIds.filter((id) => id !== cardId)
                : [...m.cardIds, cardId],
            }
          : m,
      ),
    }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex gap-2 rounded-md border border-gray-700/50 bg-gray-800/60 p-3">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Milestone name"
          className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-600"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-600"
        />
        <button
          onClick={addMilestone}
          className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {sorted.length === 0 && <p className="text-sm text-gray-500">No milestones yet.</p>}

      <ol className="space-y-3 border-l border-gray-700 pl-4">
        {sorted.map((milestone) => (
          <li key={milestone.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
            <div className="rounded-md border border-gray-700/50 bg-gray-800/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{milestone.title}</p>
                  <p className="text-xs text-gray-500">{milestone.dueDate}</p>
                </div>
                <button onClick={() => deleteMilestone(milestone.id)} className="text-gray-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
              {allCards.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => toggleCard(milestone.id, card.id)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                        milestone.cardIds.includes(card.id)
                          ? "border-blue-500 bg-blue-600/30 text-blue-200"
                          : "border-gray-700 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {card.title || "Untitled task"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
