export type Tool =
  | "select"
  | "pen"
  | "rect"
  | "ellipse"
  | "text"
  | "arrow"
  | "eraser";

export type FillPattern = "none" | "solid" | "hachure" | "cross-hatch" | "dots";

export type ShapeBase = {
  id: string;
  x: number;
  y: number;
  z: number;
  stroke: string;
  fill: string;
  fillPattern: FillPattern;
  strokeWidth: number;
};

export type PenShape = ShapeBase & {
  type: "pen";
  points: ReadonlyArray<readonly [number, number]>;
};

export type RectShape = ShapeBase & {
  type: "rect";
  width: number;
  height: number;
};

export type EllipseShape = ShapeBase & {
  type: "ellipse";
  width: number;
  height: number;
};

export type TextShape = ShapeBase & {
  type: "text";
  text: string;
  fontSize: number;
};

export type ArrowShape = ShapeBase & {
  type: "arrow";
  points: ReadonlyArray<readonly [number, number]>;
};

export type Shape = PenShape | RectShape | EllipseShape | TextShape | ArrowShape;

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type Scene = {
  shapes: ReadonlyArray<Shape>;
  camera: Camera;
};

export const DEFAULT_STROKE = "#1e1b15";
export const DEFAULT_FILL = "#c9f308";
export const DEFAULT_FILL_PATTERN: FillPattern = "none";
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_FONT_SIZE = 20;

export const STROKE_OPTIONS: ReadonlyArray<string> = [
  "#1e1b15",
  "#ba1a1a",
  "#536600",
  "#6875ff",
  "#747878",
];

export const FILL_OPTIONS: ReadonlyArray<string> = [
  "transparent",
  "#c9f308",
  "#f5ede1",
  "#1e1b15",
  "#ba1a1a",
  "#6875ff",
];

export const FILL_PATTERNS: ReadonlyArray<FillPattern> = [
  "none",
  "solid",
  "hachure",
  "cross-hatch",
  "dots",
];

export const TOOLS: ReadonlyArray<{
  id: Tool;
  label: string;
  icon: string;
  hint: string;
}> = [
  { id: "select", label: "Select", icon: "near_me", hint: "V" },
  { id: "pen", label: "Pen", icon: "draw", hint: "P" },
  { id: "rect", label: "Rectangle", icon: "rectangle", hint: "R" },
  { id: "ellipse", label: "Ellipse", icon: "circle", hint: "C" },
  { id: "text", label: "Text", icon: "title", hint: "T" },
  { id: "arrow", label: "Arrow", icon: "trending_flat", hint: "A" },
  { id: "eraser", label: "Eraser", icon: "cleaning_services", hint: "E" },
];

export const HISTORY_LIMIT = 50;
