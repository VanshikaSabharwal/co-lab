"use client";

import React from "react";
import { UI_PALETTE, DEVICE_FRAMES, type PaletteItem } from "./UiPrimitiveNode";
import { TEMPLATE_IDS, templateLabel } from "./templates";

const CATEGORIES: PaletteItem["category"][] = ["Layout", "Controls", "Content"];

function Chip({ payload, children }: { payload: string; children: React.ReactNode }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-workspace-item", payload);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="cursor-grab rounded border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-xs text-gray-300 hover:border-blue-600/60 hover:text-white active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export default function UiPalette() {
  return (
    <div className="w-44 shrink-0 overflow-y-auto border-r border-gray-700/50 bg-gray-800/80 p-3">
      {CATEGORIES.map((category) => (
        <div key={category} className="mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {category}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {UI_PALETTE.filter((item) => item.category === category).map((item) => (
              <Chip key={item.kind} payload={item.kind}>
                {item.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}

      <div className="mb-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Device frames
        </p>
        <div className="flex flex-col gap-1.5">
          {DEVICE_FRAMES.map((frame) => (
            <Chip key={frame.id} payload={`frame:${frame.id}`}>
              {frame.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Templates
        </p>
        <div className="flex flex-col gap-1.5">
          {TEMPLATE_IDS.map((id) => (
            <Chip key={id} payload={`template:${id}`}>
              {templateLabel(id)}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
