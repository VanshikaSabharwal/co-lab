"use client";

import React, { useState } from "react";
import { Bot, MoreVertical, PanelRightClose, Send, Sparkles, X } from "lucide-react";
import { cn } from "../../../../lib/utils";

interface AiAssistantPanelProps {
  fileName: string;
  /** Mobile sheet dismiss; omitted on desktop where the panel is docked. */
  onClose?: () => void;
  onGenerateReadme?: () => void;
  generatingReadme?: boolean;
  /** Collapses the docked panel to a rail. Absent on mobile, where it's a sheet. */
  onCollapse?: () => void;
}

/**
 * AI Assistant surface.
 *
 * Layout only for now — the composer is disabled until the Groq streaming
 * endpoint lands. It says so plainly rather than accepting input and silently
 * doing nothing.
 */
export default function AiAssistantPanel({
  fileName,
  onClose,
  onGenerateReadme,
  generatingReadme,
  onCollapse,
}: AiAssistantPanelProps) {
  const [draft, setDraft] = useState("");

  return (
    <aside className="flex h-full w-full flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 lg:w-80">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Bot size={16} className="text-purple-500" />
          AI Assistant
        </h2>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              onClick={onCollapse}
              aria-label="Collapse assistant"
              title="Collapse"
              className="hidden rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 lg:block"
            >
              <PanelRightClose size={15} />
            </button>
          )}
          <button
            aria-label="Assistant options"
            className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <MoreVertical size={15} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close assistant"
              className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 lg:hidden"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-xl border border-purple-200 bg-white p-3 text-sm text-gray-700 dark:border-purple-900/50 dark:bg-gray-900 dark:text-gray-200">
          <p>
            Ask about{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-[12px] dark:bg-gray-800">
              {fileName || "the open file"}
            </code>{" "}
            — explanations, refactors, or a fix you can review before applying.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Chat isn&apos;t wired up yet. The panel is here so the layout is settled;
            responses arrive with the next step.
          </p>
        </div>

        {onGenerateReadme && (
          <button
            onClick={onGenerateReadme}
            disabled={generatingReadme}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={15} />
            {generatingReadme ? "Generating…" : "Generate AI README"}
          </button>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 p-2 dark:border-gray-800">
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled
            placeholder="Ask AI… (coming soon)"
            aria-label="Ask the AI assistant"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none",
              "placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white",
            )}
          />
          <button
            disabled
            aria-label="Send"
            className="shrink-0 text-purple-500 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
