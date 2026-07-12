import { v4 as uuid } from "uuid";
import type { Node } from "@xyflow/react";
import type { UiKind } from "./UiPrimitiveNode";

interface TemplateEl {
  kind: UiKind;
  label?: string;
  x: number; // relative to template origin
  y: number;
  w: number;
  h: number;
}

// A template is just a saved arrangement of primitives.
const TEMPLATES: Record<string, { label: string; elements: TemplateEl[] }> = {
  login: {
    label: "Login",
    elements: [
      { kind: "frame", label: "Login", x: 0, y: 0, w: 320, h: 420 },
      { kind: "text", label: "Welcome back", x: 60, y: 48, w: 200, h: 28 },
      { kind: "text", label: "Sign in to continue", x: 60, y: 82, w: 200, h: 20 },
      { kind: "input", label: "Email", x: 40, y: 140, w: 240, h: 38 },
      { kind: "input", label: "Password", x: 40, y: 192, w: 240, h: 38 },
      { kind: "button", label: "Sign in", x: 40, y: 252, w: 240, h: 40 },
      { kind: "text", label: "Forgot password?", x: 90, y: 308, w: 140, h: 20 },
    ],
  },
  dashboard: {
    label: "Dashboard",
    elements: [
      { kind: "frame", label: "Dashboard", x: 0, y: 0, w: 520, h: 380 },
      { kind: "navbar", label: "Product", x: 16, y: 16, w: 488, h: 44 },
      { kind: "card", label: "Revenue", x: 16, y: 76, w: 152, h: 84 },
      { kind: "card", label: "Users", x: 184, y: 76, w: 152, h: 84 },
      { kind: "card", label: "Errors", x: 352, y: 76, w: 152, h: 84 },
      { kind: "chart", label: "Traffic", x: 16, y: 176, w: 320, h: 184 },
      { kind: "table", label: "Latest events", x: 352, y: 176, w: 152, h: 184 },
    ],
  },
  onboarding: {
    label: "Onboarding",
    elements: [
      { kind: "frame", label: "Onboarding", x: 0, y: 0, w: 280, h: 480 },
      { kind: "image", label: "illustration", x: 40, y: 48, w: 200, h: 160 },
      { kind: "text", label: "Collaborate in real time", x: 40, y: 236, w: 200, h: 26 },
      { kind: "text", label: "Design, plan and code together", x: 40, y: 270, w: 200, h: 20 },
      { kind: "badge", label: "1 / 3", x: 104, y: 320, w: 72, h: 22 },
      { kind: "button", label: "Next", x: 40, y: 380, w: 200, h: 40 },
      { kind: "text", label: "Skip", x: 116, y: 434, w: 48, h: 18 },
    ],
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[];
export const templateLabel = (id: string) => TEMPLATES[id]?.label ?? id;

/** Instantiate a template's elements as fresh nodes at the given origin. */
export function buildTemplateNodes(
  templateId: string,
  origin: { x: number; y: number },
): Node[] {
  const template = TEMPLATES[templateId];
  if (!template) return [];
  return template.elements.map((el, index) => ({
    id: uuid(),
    type: "uiPrimitive",
    position: { x: origin.x + el.x, y: origin.y + el.y },
    style: { width: el.w, height: el.h },
    // Frames go behind their contents
    zIndex: el.kind === "frame" ? 0 : index,
    data: { kind: el.kind, label: el.label ?? "" },
  }));
}
