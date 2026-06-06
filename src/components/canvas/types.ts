export type Tool =
  | "select"
  | "pan"
  | "pen"
  | "rect"
  | "ellipse"
  | "text"
  | "arrow"
  | "eraser";

export type FillPattern = "none" | "solid" | "hachure" | "cross-hatch" | "dots";

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export type ShapeBase = {
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

export type PenShape = ShapeBase & {
  type: "pen";
  points: ReadonlyArray<readonly [number, number, number]>;
  size: number;
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
  width?: number;
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
export const DEFAULT_PEN_SIZE = 4;
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
  { id: "select", label: "Select", icon: "arrow_selector_tool", hint: "V" },
  { id: "pan", label: "Pan", icon: "pan_tool", hint: "H" },
  { id: "pen", label: "Pen", icon: "ink_pen", hint: "P" },
  { id: "rect", label: "Rectangle", icon: "rectangle", hint: "R" },
  { id: "ellipse", label: "Ellipse", icon: "circle", hint: "C" },
  { id: "text", label: "Text", icon: "title", hint: "T" },
  { id: "arrow", label: "Arrow", icon: "arrow_outward", hint: "A" },
  { id: "eraser", label: "Eraser", icon: "ink_eraser", hint: "E" },
];

export const HISTORY_LIMIT = 50;

export const SNAP_GRID_SIZE = 8;
export const SNAP_THRESHOLD = 4;

/**
 * Backwards-compatible scene migration. Old scenes stored in the DB
 * might not have `rotation`, `groupId`, `size` on pen shapes, etc.
 * This function backfills defaults so the rest of the code can rely
 * on the schema.
 */
export function migrateShape(s: Shape): Shape {
  switch (s.type) {
    case "pen": {
      const points: ReadonlyArray<readonly [number, number, number]> =
        s.points.map((p) => [p[0], p[1], p[2] ?? 0.5]);
      const size =
        typeof (s as { size?: unknown }).size === "number"
          ? (s as { size: number }).size
          : s.strokeWidth * 1.5 || DEFAULT_PEN_SIZE;
      return {
        ...s,
        rotation: s.rotation ?? 0,
        groupId: s.groupId ?? null,
        z: s.z ?? 0,
        points,
        size,
      };
    }
    case "rect":
    case "ellipse":
      return {
        ...s,
        rotation: s.rotation ?? 0,
        groupId: s.groupId ?? null,
        z: s.z ?? 0,
      };
    case "text":
      return {
        ...s,
        rotation: s.rotation ?? 0,
        groupId: s.groupId ?? null,
        z: s.z ?? 0,
        width: s.width,
      };
    case "arrow": {
      const points: ReadonlyArray<readonly [number, number]> = s.points.map(
        (p) => [p[0], p[1]] as readonly [number, number],
      );
      return {
        ...s,
        rotation: s.rotation ?? 0,
        groupId: s.groupId ?? null,
        z: s.z ?? 0,
        points,
      };
    }
  }
}

export function migrateScene(scene: Scene): Scene {
  return {
    camera: {
      x: scene.camera.x,
      y: scene.camera.y,
      zoom: scene.camera.zoom,
    },
    shapes: scene.shapes.map(migrateShape),
  };
}
