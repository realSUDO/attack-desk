export type Tool =
  | "select"
  | "pan"
  | "pen"
  | "rect"
  | "ellipse"
  | "arrow"
  | "text"
  | "eraser";

export type FillPattern = "none" | "solid" | "hachure" | "cross-hatch" | "dots";

export const FILL_PATTERNS: ReadonlyArray<FillPattern> = [
  "none",
  "solid",
  "hachure",
  "cross-hatch",
  "dots",
];

export const STROKE_OPTIONS: ReadonlyArray<string> = [
  "#1e1b15",
  "#ba1a1a",
  "#536600",
  "#1c6587",
  "#444748",
  "#fff8f1",
];

export const FILL_OPTIONS: ReadonlyArray<string> = [
  "transparent",
  "#fff8f1",
  "#c9f308",
  "#fbf3e7",
  "#1e1b15",
  "#ba1a1a",
];

export type Shape = RectShape | EllipseShape | ArrowShape | PenShape | TextShape;

type BaseShape = {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  groupId: string | null;
  stroke: string;
  fill: string;
  fillPattern: FillPattern;
  strokeWidth: number;
};

export type RectShape = BaseShape & {
  type: "rect";
  width: number;
  height: number;
};

export type EllipseShape = BaseShape & {
  type: "ellipse";
  width: number;
  height: number;
};

export type ArrowShape = BaseShape & {
  type: "arrow";
  points: ReadonlyArray<readonly [number, number]>;
};

export type PenShape = BaseShape & {
  type: "pen";
  size: number;
  points: ReadonlyArray<readonly [number, number, number]>;
};

export type TextShape = BaseShape & {
  type: "text";
  text: string;
  fontSize: number;
};

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type Scene = {
  camera: Camera;
  shapes: ReadonlyArray<Shape>;
};

export const EMPTY_SCENE: Scene = {
  camera: { x: 0, y: 0, zoom: 1 },
  shapes: [],
};

export type ToolDefaults = {
  stroke: string;
  fill: string;
  fillPattern: FillPattern;
  strokeWidth: number;
  penSize: number;
  fontSize: number;
};

export const DEFAULT_TOOL_DEFAULTS: ToolDefaults = {
  stroke: STROKE_OPTIONS[0]!,
  fill: "transparent",
  fillPattern: "none",
  strokeWidth: 2,
  penSize: 4,
  fontSize: 20,
};

export const HISTORY_LIMIT = 100;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function isShape(value: unknown): value is Shape {
  if (!value || typeof value !== "object") return false;
  const s = value as { type?: unknown };
  return (
    s.type === "rect" ||
    s.type === "ellipse" ||
    s.type === "arrow" ||
    s.type === "pen" ||
    s.type === "text"
  );
}

export function parseScene(raw: unknown): Scene {
  if (!raw || typeof raw !== "object") return EMPTY_SCENE;
  const r = raw as { camera?: unknown; shapes?: unknown };
  const camera: Camera = {
    x:
      r.camera && typeof r.camera === "object" && typeof (r.camera as Camera).x === "number"
        ? (r.camera as Camera).x
        : 0,
    y:
      r.camera && typeof r.camera === "object" && typeof (r.camera as Camera).y === "number"
        ? (r.camera as Camera).y
        : 0,
    zoom:
      r.camera && typeof r.camera === "object" && typeof (r.camera as Camera).zoom === "number"
        ? (r.camera as Camera).zoom
        : 1,
  };
  const shapes: Array<Shape> = Array.isArray(r.shapes)
    ? (r.shapes.filter(isShape) as Array<Shape>)
    : [];
  return { camera, shapes };
}
