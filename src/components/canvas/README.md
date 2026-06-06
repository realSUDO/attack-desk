# Canvas

A Konva-powered infinite whiteboard embedded in AttackDesk. Draw freehand
strokes, drop rectangles and ellipses, route magnetic arrows between shapes,
and place text annotations — all backed by a Redux-style reducer store with
undo/redo, autosave, and server-side persistence.

## Overview

- **Engine**: [`konva`](https://konvajs.org/) + [`react-konva`](https://github.com/konvajs/react-konva) for the Stage/Layer tree.
- **Freehand rendering**: [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand) for variable-width pen and arrow strokes.
- **State**: Local in-memory reducer (`useReducer`) with undo/redo, optimistic updates, and 1.5s debounced autosave via the canvas API route.
- **Design system**: Brutalist — 0px radii, 1px borders, cream surface (`#fff8f1`) with lime accent (`#c9f308`).
- **Typography**: Schoolbell (canvas handwriting), Hanken Grotesk (headlines/body), Geist Mono (code/values), Geist (UI labels), Material Symbols Outlined (icons).

## File Structure

```
src/components/canvas/
├── CanvasList.tsx          # Grid view of all canvases (/canvas)
├── CanvasPage.tsx          # Editor page orchestration (/canvas/[id])
├── CanvasToolbar.tsx       # Tool palette + undo/redo/save controls
├── CanvasInspector.tsx     # Right sidebar: title, tool defaults, selection panel
├── KonvaCanvas.tsx         # The Stage — all drawing, selection, transform logic
├── LinkMissionModal.tsx    # Modal to link a canvas to a mission
├── ContextMenu.tsx         # Right-click context menu
├── penPath.ts              # perfect-freehand helpers (pen, arrow body, arrowhead)
├── store.ts                # Reducer + useScene hook + SceneApi
└── types.ts                # Shape schema, tool enums, parseScene, color palettes

src/actions/canvas.actions.ts  # Server Actions: create, save, delete, link/unlink
src/app/canvas/                # Routes: /canvas (list), /canvas/[id] (editor)
```

## Data Model

The scene is a single JSON-serialisable object:

```ts
type Scene = {
  version: 1;
  shapes: ReadonlyArray<Shape>;
  camera: { x: number; y: number; zoom: number };
  nextZ: number;
};
```

### Shape Types

| Type     | Discriminator | Notes                                                        |
| -------- | ------------- | ------------------------------------------------------------ |
| `rect`   | `type: "rect"`   | Position + width/height, stroke + fill.                      |
| `ellipse` | `type: "ellipse"` | Position = top-left of bounding box; width/height = full size. |
| `arrow`  | `type: "arrow"`  | Points relative to `shape.x/y`; body is a perfect-freehand stroke, head is a separate triangle. |
| `pen`    | `type: "pen"`    | Freehand points with pressure; rendered as a perfect-freehand path. |
| `text`   | `type: "text"`   | DOM textarea overlay for editing; Konva text hidden while editing. |

All shapes share: `id`, `x`, `y`, `z`, `rotation`, `groupId`, `stroke`,
`fill`, `fillPattern`, `strokeWidth`.

### Color & Pattern Palettes

- `STROKE_OPTIONS` — 8 preset ink colors (deduped in v3).
- `FILL_OPTIONS` — 6 surface colors + `transparent`.
- `FILL_PATTERNS` — `none` | `solid` | `hatch` | `cross`.

## Store (`store.ts`)

The store is a `useReducer` with these actions:

| Action                     | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `setTool`                  | (Not in reducer — local state in `CanvasPage`) |
| `addShape`                 | Append a new shape, auto-assign `id` and `z`. |
| `updateShape`              | Patch a single shape by id.                   |
| `updateMany`               | Patch multiple shapes in one dispatch (used for multi-select sliders). |
| `removeShapes`             | Delete by id list.                            |
| `duplicate`                | Clone selected shapes with offset.            |
| `bringToFront` / `sendToBack` | Z-order using fractional z.                |
| `bringForward` / `sendBackward` | Nudge z.                                 |
| `groupShapes` / `ungroupShapes` | Set/clear `groupId`.                     |
| `beginCoalesce` / `endCoalesce` | Coalesce rapid updates into one undo step. |
| `undo` / `redo`            | History navigation (last 50 states).          |
| `setCamera`                | Pan/zoom the Stage.                           |
| `loadScene`                | Replace the whole scene (for load + initial seed). |

`useScene` returns `{ scene, api }` where `api` is a memoised bag of action
creators. The reducer is pure and `parseScene` in `types.ts` is forgiving
(it filters out malformed shapes with a Zod-like check).

## Components

### `CanvasPage.tsx`

The editor shell. Owns:

- The scene store (`useScene`).
- The active tool (`useState<Tool>`).
- Selection (`useState<string[]>`).
- Editing text id (`useState<string | null>`).
- Autosave timer (1.5s debounce after the last local edit).
- All keyboard shortcuts (see below).
- The link-to-mission modal trigger.

It composes `CanvasToolbar`, `KonvaCanvas`, `CanvasInspector`, and the
optional `TextEditorOverlay` + `ContextMenu`.

### `KonvaCanvas.tsx`

The Stage. Responsibilities:

- Stage sizing via `ResizeObserver` on the container div.
- Pan with the pan tool or right-button drag; zoom with the wheel gesture.
- A stationary right-click opens a contextual menu. Dragging with the right
  button temporarily grabs the canvas and suppresses that menu.
- Grid background.
- Tool dispatch through pointer events (select/pen/rect/ellipse/arrow/text/eraser).
- Live drawing via refs + `requestAnimationFrame` for pen, rect, ellipse, arrow, eraser.
- Marquee selection (dashed rect with AABB intersection test).
- Transformer binding (8 anchors, `rotateEnabled`, `keepRatio={false}`, `ignoreStroke`).
- Magnetic snap for arrows (12px screen-space threshold, lime ring on target).
- Context menu trigger (right-click).

### `CanvasInspector.tsx`

Right sidebar. The active tab is **derived from context** (no `useState`):

- Draw tool active → "Defaults" tab (shows tool-specific options).
- Select tool + selection → "Selection" tab.
- Select tool + no selection → "Defaults" tab (says "No defaults for this tool").

#### Tool Defaults (per active tool)

| Tool        | Shown controls                              |
| ----------- | ------------------------------------------- |
| `pen`       | Stroke color, pen size.                     |
| `rect`      | Stroke, fill, pattern, stroke width.        |
| `ellipse`   | Stroke, fill, pattern, stroke width.        |
| `arrow`     | Stroke, stroke width.                       |
| `text`      | Stroke (text color), text size.             |
| `select`    | "No defaults for this tool."               |
| `pan`       | "No defaults for this tool."               |
| `eraser`    | "No defaults for this tool."               |

#### Selection Panel (selective, multi-select intersection)

| Control       | Shown when                                                       |
| ------------- | ---------------------------------------------------------------- |
| Stroke        | All selected have stroke field (always true).                    |
| Fill          | ALL selected are `rect` or `ellipse`.                            |
| Fill pattern  | ALL selected are `rect` or `ellipse`.                            |
| Stroke width  | ALL selected are `rect`, `ellipse`, or `arrow`.                  |
| Pen size      | ALL selected are `pen`.                                          |
| Text size     | ALL selected are `text`.                                         |

### `CanvasToolbar.tsx`

8 tools, undo/redo, save indicator. The keyboard hint label is resolved
through a `TOOL_KEY_LABEL` map (replaced a 9-level ternary in v3).

### `TextEditorOverlay` (in `CanvasPage.tsx`)

A DOM `<textarea>` positioned in screen coordinates (shape world pos ×
zoom + camera offset). Konva text is hidden while editing (`isHidden` prop
on `ShapeNode`). Commits on blur or Esc/Cmd+Enter. Empty text deletes the
shape.

## Tools

| Key | Tool      | Behavior                                                       |
| --- | --------- | -------------------------------------------------------------- |
| V   | `select`  | Click to select, Shift+click to add, drag for marquee.         |
| H   | `pan`     | Drag to pan the camera.                                        |
| P   | `pen`     | Drag to draw a freehand stroke.                                |
| R   | `rect`    | Drag to draw a rectangle.                                      |
| O   | `ellipse` | Drag to draw an ellipse.                                       |
| A   | `arrow`   | Drag to draw an arrow. Snaps magnetically to nearby shape edges. |
| T   | `text`    | Click to place a text annotation. Enters edit mode immediately. |
| E   | `eraser`  | Drag to erase any shape you touch.                             |

Additional shortcuts: `Cmd/Ctrl+Z` (undo), `Cmd/Ctrl+Shift+Z` (redo),
`Cmd/Ctrl+D` (duplicate), `Delete`/`Backspace` (remove), arrow keys
(nudge 1px, Shift+arrow = 10px), `Cmd/Ctrl+S` (save).

## Key Patterns

### ShapeNode with scale-reset

The Transformer applies `scaleX`/`scaleY` directly to the Konva node during
resize, so the preview stays realtime without React state updates.
Text uses whiteboard-style controls: side handles change wrapping width, while
corner handles scale the handwriting proportionally.
We bake the scale into the shape's intrinsic dimensions (or point arrays)
in `onTransformEnd`, then a `useLayoutEffect` in `ShapeNode` resets the
Konva scale to 1 **after** the store update propagates. This avoids the
rAF flash from the previous version.

```tsx
useLayoutEffect(() => {
  const n = nodeRef.current;
  if (!n) return;
  if (n.scaleX() !== 1 || n.scaleY() !== 1) {
    n.scaleX(1);
    n.scaleY(1);
    n.getLayer()?.batchDraw();
  }
});
```

### Standard arrow geometry

Arrows use Konva's stroked arrow primitive with rounded joins. Pointer length
and width scale from the selected stroke width, so the shaft and tip remain
visually balanced.

### Shape fill patterns

Hachure, cross-hatch, and dot fills use small cached canvas tiles. The tiles
combine the selected fill and stroke colors and are reused across shapes.

### Magnetic arrow snapping

During `extendArrow`, the live point is clamped to the nearest bounding-box
edge within a 12px screen-space threshold. A lime ring (`<Circle>`) renders
on the snap target as a visual hint. The snap target id is excluded from
its own snap so arrows don't self-stick.

### Coalesced drawing

Pen, rect, ellipse, arrow, and eraser call `beginCoalesce()` on mousedown
and `endCoalesce()` on mouseup. The reducer batches every `updateShape`
between those two calls into a single history entry — so a 200-point
freehand stroke is one undo step, not 200.

### `strokeScaleEnabled: false`

All shape nodes have `strokeScaleEnabled={false}` in their `commonProps`,
so stroke thickness doesn't change as you resize a shape. The shape grows
around its stroke.

### Tab state is derived, not stored

The inspector's active tab is computed from props:

```ts
const activeTab: Tab = isDrawTool(tool) || !any ? "defaults" : "selection";
```

No `useState`, no `useEffect` to sync — the tab always matches context.

## Autosave & Persistence

- Local state is the source of truth during editing.
- Every reducer action that mutates `shapes` or `camera` marks the scene
  dirty and starts a 1.5s debounce timer.
- On flush, `saveCanvasAction(canvasId, scene)` posts the full scene to the
  server, which writes a JSON blob to PostgreSQL via Prisma.
- On load, `parseScene` is forgiving — it filters out malformed shapes
  and falls back to `EMPTY_SCENE` for the sample canvases (canvas-1,
  canvas-2, canvas-3) when the database is empty.

## Rendering Strategy

- `/` and `/showcase` — ○ Static.
- `/canvas` and `/canvas/[id]` — ƒ Dynamic (server-rendered on demand).
- The `KonvaCanvas` component is `"use client"` and ships all
  interactivity; the page shell is server-rendered with a seeded scene.

## Limitations

- Single-user; no realtime collaboration.
- No image embedding yet.
- No export (PNG/SVG/PDF).
- No keyboard navigation through shapes (Tab/Shift+Tab).
- Undo history is capped at 50 entries.
- Canvas data is stored as a JSON blob (not normalised).
