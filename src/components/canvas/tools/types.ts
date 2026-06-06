import type { Shape, Tool, Camera, ResizeHandle, FillPattern } from "../types";
import type { Vec2 } from "../geometry";
import type { SnapGuide } from "../snap";

export type PointerInfo = {
  wx: number;
  wy: number;
  sx: number;
  sy: number;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  pointerId: number;
  pressure: number;
  coalesced: ReadonlyArray<PointerInfo>;
};

export type InteractionState =
  | { kind: "idle" }
  | { kind: "panning"; startClient: { x: number; y: number }; startCamera: Camera }
  | { kind: "marquee"; start: Vec2; end: Vec2; additive: boolean }
  | {
      kind: "translating";
      ids: ReadonlyArray<string>;
      lastWorld: Vec2;
      groupBounds: { x: number; y: number; w: number; h: number };
      additive: boolean;
    }
  | {
      kind: "resizing";
      ids: ReadonlyArray<string>;
      handle: ResizeHandle;
      startBounds: { x: number; y: number; w: number; h: number };
    }
  | {
      kind: "drawing_pen";
      id: string;
      origin: Vec2;
      rawPoints: Array<[number, number, number]>;
    }
  | { kind: "drawing_rect"; id: string; origin: Vec2 }
  | { kind: "drawing_ellipse"; id: string; origin: Vec2 }
  | { kind: "drawing_arrow"; id: string; origin: Vec2; points: ReadonlyArray<readonly [number, number]> }
  | { kind: "editing_text"; id: string }
  | { kind: "erasing"; hits: Set<string>; trail: Array<Vec2>; lockFirst: boolean };

export type ToolContext = {
  shapes: ReadonlyArray<Shape>;
  camera: Camera;
  tool: Tool;
  selection: ReadonlySet<string>;
  addShape: (partial: Omit<Shape, "id" | "z">) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShapes: (ids: ReadonlyArray<string>) => void;
  translateShapes: (ids: ReadonlyArray<string>, dx: number, dy: number) => void;
  setCamera: (patch: Partial<Camera>) => void;
  setSelection: (ids: ReadonlyArray<string>, additive?: boolean) => void;
  setHover: (id: string | null, handle: ResizeHandle | null) => void;
  beginCoalesce: () => void;
  endCoalesce: () => void;
  requestTextEdit: (id: string) => void;
  showContextMenu: (point: { sx: number; sy: number; wx: number; wy: number }, ids: ReadonlyArray<string>) => void;
  setSnapGuides: (guides: ReadonlyArray<SnapGuide>) => void;
  snapToGrid: boolean;
  snapToShapes: boolean;
};

export const DEFAULT_RECT_DEFAULTS: {
  stroke: string;
  fill: string;
  fillPattern: FillPattern;
  strokeWidth: number;
} = {
  stroke: "#1e1b15",
  fill: "transparent",
  fillPattern: "none",
  strokeWidth: 2,
};
