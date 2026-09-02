# Ko-lab UI generation prompt

Paste everything below the line into ChatGPT, then replace the
`<<< ... >>>` block at the bottom with what you actually want built.

---

You are generating a UI component for **Ko-lab**, an existing production
Next.js collaboration app. Match the codebase conventions below exactly —
this component must drop into the repo without rewrites.

## Stack (do not substitute)

- Next.js 14.2, App Router
- React 18.3 (NOT React 19 — no `use()`, no async client components)
- TypeScript 5, strict
- Tailwind CSS 3.4 — utility classes only
- `lucide-react` for icons
- `next-themes` for dark mode
- `next-auth` v4 for session (`useSession` from `next-auth/react`)
- `@xyflow/react` — only for canvas/graph surfaces

## Hard constraints

1. **No new dependencies.** No shadcn/ui, no Radix, no MUI, no
   framer-motion, no clsx/cva, no Headless UI. Hand-roll every primitive
   (dialog, dropdown, tooltip, tabs) with plain divs, Tailwind and React
   state.
2. **No design tokens.** `tailwind.config.js` has an empty
   `theme.extend` — there are no custom colors, no CSS variables, no
   `bg-primary`. Use stock Tailwind utilities written inline (`bg-blue-600`,
   `text-gray-700`). Do not invent token names.
3. **Dark mode is `class`-based** and written inline per element with
   `dark:` variants. There is no `prefers-color-scheme` media query usage.
   Every surface, border and text color needs an explicit `dark:` pair.
4. **`"use client"`** at the top of any file using hooks, state or events.
5. Style with `className` strings only — no `style={{}}` except for
   genuinely dynamic values (computed transforms, positions).

## Exact palette in use

Use these specific values so the component blends in:

| Role | Light | Dark |
|---|---|---|
| Page background | `bg-white` | `dark:bg-gray-900` (or `dark:bg-gray-950`) |
| Card / panel | `bg-white` | `dark:bg-gray-800` |
| Raised / hover row | `bg-gray-100` | `dark:bg-gray-700` |
| Primary text | `text-gray-900` | `dark:text-white` |
| Secondary text | `text-gray-700` | `dark:text-gray-300` |
| Muted / meta text | `text-gray-500` | `dark:text-gray-400` |
| Border | `border-gray-200` / `border-gray-300` | `dark:border-gray-700` |
| Subtle divider | `divide-gray-200` | `dark:divide-gray-700/60` |

Accents:

- Primary action: `bg-blue-600 text-white hover:bg-blue-700 transition`
  with `disabled:opacity-60`
- Marketing / hero CTA only:
  `bg-gradient-to-r from-blue-600 to-indigo-600`
- Destructive: `text-red-500 hover:text-red-600` (icon buttons),
  `bg-red-600 hover:bg-red-700 text-white` (solid)
- Success: `bg-green-600`, `dark:bg-green-900` for tinted backgrounds
- Focus rings: `outline-none focus:ring-2 focus:ring-blue-500`

Shape and spacing: `rounded-lg` for buttons/inputs, `rounded-md` for
cards/panels, `rounded-xl` for modals. Shadows `shadow-lg` on floating
surfaces. Icons are 14–16px (`size={14}`, `size={16}`).

## Component conventions

- Default-export a single function component; named-export its props
  interface and any shared data types.
- Props are an explicit `interface`, no `React.FC`.
- Callbacks are named `onDoThing`, state setters `setThing`.
- Lists always keyed by a stable id (`uuid` from the `uuid` package),
  never by array index.
- Handlers that hit the API use `fetch` to a `/api/...` route and always
  handle the non-OK branch with a user-visible error string in state.
- Comments explain *why* something is non-obvious, not *what* the line
  does. Skip comments on self-evident code.

## Responsive + a11y

- Mobile-first. The app is used on phones — modals are bottom sheets on
  small screens (`items-end sm:items-center`), and touch targets are at
  least 44px in the tap dimension (`py-2` minimum, `p-1.5` on icon
  buttons).
- Overlay pattern in use: `fixed inset-0 z-50 flex items-end
  justify-center bg-black/50 sm:items-center`.
- Wide content (tables, canvases, code) scrolls in its own
  `overflow-x-auto` container; the page body never scrolls sideways.
- Semantic elements (`button`, `nav`, `label`), `aria-label` on
  icon-only buttons, visible focus states, Escape closes overlays.

## Output format

Return one complete `.tsx` file, ready to paste. Include all imports.
No placeholder comments like `// ... rest of component`. If the design
needs a decision I did not specify, pick the option most consistent with
the conventions above and note it in one line after the code.

---

<<< REPLACE THIS BLOCK — describe the component you want:

What to build:
Where it lives (route/file path):
Data it receives (props/shape):
What the user can do with it:
Empty / loading / error states:

>>>
