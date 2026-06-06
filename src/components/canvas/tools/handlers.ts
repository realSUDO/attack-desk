import {
  DEFAULT_PEN_SIZE,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  type ArrowShape,
  type EllipseShape,
  type PenShape,
  type RectShape,
  type Shape,
  type TextShape,
} from "../types";
import type { ResizeHandle } from "../types";
import {
  getResizeHandlePositions,
  hitTestShape,
  rectBounds,
  shapeBounds,
} from "../geometry";
import { resamplePolyline, simplifyRDP } from "../geometry";
import type {
  InteractionState,
  PointerInfo,
  ToolContext,
} from "./types";

export function topmostHit(
  ctx: ToolContext,
  x: number,
  y: number,
  tolerance: number,
): Shape | null {
  for (let i = ctx.shapes.length - 1; i >= 0; i -= 1) {
    const s = ctx.shapes[i]!;
    if (hitTestShape(s, x, y, tolerance)) return s;
  }
  return null;
}

export function getHandleAt(
  ctx: ToolContext,
  x: number,
  y: number,
): { id: string; handle: ResizeHandle } | null {
  if (ctx.selection.size === 0) return null;
  const r = 10 / ctx.camera.zoom / 2;
  for (const id of ctx.selection) {
    const shape = ctx.shapes.find((s) => s.id === id);
    if (!shape) continue;
    if (shape.type === "pen" || shape.type === "arrow") continue;
    const b = shapeBounds(shape);
    for (const pos of getResizeHandlePositions(b)) {
      if (Math.abs(x - pos.x) <= r && Math.abs(y - pos.y) <= r) {
        return { id, handle: pos.handle };
      }
    }
  }
  return null;
}

export function selectToolOnIdleClick(
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const handleHit = getHandleAt(ctx, info.wx, info.wy);
  if (handleHit && handleHit.handle) {
    const shape = ctx.shapes.find((s) => s.id === handleHit.id)!;
    const b = shapeBounds(shape);
    return {
      kind: "resizing",
      ids: [handleHit.id],
      handle: handleHit.handle,
      startBounds: { x: b.x, y: b.y, w: b.w, h: b.h },
    };
  }
  const hit = topmostHit(ctx, info.wx, info.wy, 4 / ctx.camera.zoom);
  if (hit) {
    const additive = info.shiftKey || info.metaKey || info.ctrlKey;
    let ids: ReadonlyArray<string>;
    if (additive) {
      if (ctx.selection.has(hit.id)) {
        const next = new Set(ctx.selection);
        next.delete(hit.id);
        ids = Array.from(next);
      } else {
        ids = Array.from(new Set([...ctx.selection, hit.id]));
      }
    } else if (hit.groupId && ctx.selection.has(hit.id)) {
      ids = Array.from(ctx.selection);
    } else if (hit.groupId) {
      const group = ctx.shapes.filter((s) => s.groupId === hit.groupId).map((s) => s.id);
      ids = group;
    } else {
      ids = [hit.id];
    }
    ctx.setSelection(ids, additive);
    const b = computeGroupBounds(ctx, ids);
    ctx.beginCoalesce();
    return {
      kind: "translating",
      ids,
      lastWorld: [info.wx, info.wy],
      groupBounds: b,
      additive,
    };
  }
  ctx.setSelection([], false);
  return {
    kind: "marquee",
    start: [info.wx, info.wy],
    end: [info.wx, info.wy],
    additive: info.shiftKey || info.metaKey || info.ctrlKey,
  };
}

export function computeGroupBounds(
  ctx: ToolContext,
  ids: ReadonlyArray<string>,
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let any = false;
  for (const id of ids) {
    const s = ctx.shapes.find((sh) => sh.id === id);
    if (!s) continue;
    const b = shapeBounds(s);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
    any = true;
  }
  if (!any) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function selectToolOnDoubleClick(
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState | null {
  const hit = topmostHit(ctx, info.wx, info.wy, 4 / ctx.camera.zoom);
  if (!hit) return null;
  if (hit.type === "text") {
    ctx.setSelection([hit.id], false);
    ctx.requestTextEdit(hit.id);
    return { kind: "editing_text", id: hit.id };
  }
  return null;
}

export function translatingOnMove(
  state: Extract<InteractionState, { kind: "translating" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const dx = info.wx - state.lastWorld[0];
  const dy = info.wy - state.lastWorld[1];
  if (dx === 0 && dy === 0) return state;
  ctx.translateShapes(state.ids, dx, dy);
  return { ...state, lastWorld: [info.wx, info.wy], groupBounds: {
    x: state.groupBounds.x + dx,
    y: state.groupBounds.y + dy,
    w: state.groupBounds.w,
    h: state.groupBounds.h,
  } };
}

export function translatingOnUp(): InteractionState {
  return { kind: "idle" };
}

export function resizingOnMove(
  state: Extract<InteractionState, { kind: "resizing" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const start = state.startBounds;
  let nx = start.x, ny = start.y, nw = start.w, nh = start.h;
  const dx = info.wx - (start.x + (state.handle.includes("e") ? start.w : state.handle.includes("w") ? 0 : start.w / 2));
  const dy = info.wy - (start.y + (state.handle.includes("s") ? start.h : state.handle.includes("n") ? 0 : start.h / 2));
  if (state.handle.includes("e")) nw = Math.max(2, start.w + (info.wx - (start.x + start.w)));
  if (state.handle.includes("s")) nh = Math.max(2, start.h + (info.wy - (start.y + start.h)));
  if (state.handle.includes("w")) {
    const nextX = Math.min(info.wx, start.x + start.w - 2);
    nw = start.x + start.w - nextX;
    nx = nextX;
  }
  if (state.handle.includes("n")) {
    const nextY = Math.min(info.wy, start.y + start.h - 2);
    nh = start.y + start.h - nextY;
    ny = nextY;
  }
  for (const id of state.ids) {
    const shape = ctx.shapes.find((s) => s.id === id);
    if (!shape) continue;
    if (shape.type === "rect" || shape.type === "ellipse") {
      ctx.updateShape(id, { x: nx, y: ny, width: nw, height: nh } as Partial<Shape>);
    } else if (shape.type === "text") {
      ctx.updateShape(id, { x: nx, y: ny, width: nw } as Partial<Shape>);
    }
  }
  void dx; void dy;
  return state;
}

export function resizingOnUp(ctx: ToolContext): InteractionState {
  ctx.endCoalesce();
  return { kind: "idle" };
}

export function marqueeOnMove(
  state: Extract<InteractionState, { kind: "marquee" }>,
  info: PointerInfo,
): InteractionState {
  return { ...state, end: [info.wx, info.wy] };
}

export function marqueeOnUp(
  state: Extract<InteractionState, { kind: "marquee" }>,
  ctx: ToolContext,
): InteractionState {
  const a = state.start;
  const b = state.end;
  const rect = {
    x: Math.min(a[0], b[0]),
    y: Math.min(a[1], b[1]),
    w: Math.abs(b[0] - a[0]),
    h: Math.abs(b[1] - a[1]),
  };
  const ids: string[] = [];
  for (const shape of ctx.shapes) {
    const sb = shapeBounds(shape);
    if (
      sb.x + sb.w >= rect.x &&
      sb.x <= rect.x + rect.w &&
      sb.y + sb.h >= rect.y &&
      sb.y <= rect.y + rect.h
    ) {
      ids.push(shape.id);
    }
  }
  if (state.additive) {
    const next = new Set(ctx.selection);
    for (const id of ids) next.add(id);
    ctx.setSelection(Array.from(next), true);
  } else {
    ctx.setSelection(ids, false);
  }
  return { kind: "idle" };
}

export function panToolOnIdleClick(info: PointerInfo, ctx: ToolContext): InteractionState {
  return {
    kind: "panning",
    startClient: { x: info.sx, y: info.sy },
    startCamera: ctx.camera,
  };
}

export function panningOnMove(
  state: Extract<InteractionState, { kind: "panning" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const dx = info.sx - state.startClient.x;
  const dy = info.sy - state.startClient.y;
  ctx.setCamera({
    x: state.startCamera.x - dx,
    y: state.startCamera.y - dy,
  });
  return state;
}

export function panningOnUp(): InteractionState {
  return { kind: "idle" };
}

export function penToolOnIdleClick(
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const initial: PenShape = {
    id: "",
    type: "pen",
    x: info.wx,
    y: info.wy,
    z: 0,
    rotation: 0,
    groupId: null,
    stroke: DEFAULT_STROKE,
    fill: "transparent",
    fillPattern: "none",
    strokeWidth: DEFAULT_STROKE_WIDTH,
    size: DEFAULT_PEN_SIZE,
    points: [[0, 0, info.pressure || 0.5]],
  };
  const id = ctx.addShape(initial);
  ctx.setSelection([id], false);
  ctx.beginCoalesce();
  return {
    kind: "drawing_pen",
    id,
    origin: [info.wx, info.wy],
    rawPoints: [[0, 0, info.pressure || 0.5]],
  };
}

export function penDrawingOnMove(
  state: Extract<InteractionState, { kind: "drawing_pen" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const events = info.coalesced.length > 0 ? info.coalesced : [info];
  for (const ev of events) {
    state.rawPoints.push([ev.wx - state.origin[0], ev.wy - state.origin[1], ev.pressure || 0.5]);
  }
  const resampled = resamplePolyline(
    state.rawPoints.map(([x, y]) => [x, y] as const),
    1.5,
  );
  const next: Array<readonly [number, number, number]> = resampled.map(([x, y], i) => {
    const orig = state.rawPoints[i] ?? [x, y, 0.5];
    return [x, y, orig[2] ?? 0.5];
  });
  ctx.updateShape(state.id, { points: next } as Partial<Shape>);
  return state;
}

export function penDrawingOnUp(
  state: Extract<InteractionState, { kind: "drawing_pen" }>,
  ctx: ToolContext,
): InteractionState {
  const shape = ctx.shapes.find((s) => s.id === state.id);
  if (shape && shape.type === "pen") {
    const simplified = simplifyRDP(
      shape.points.map((p) => [p[0], p[1]] as const),
      0.7,
    );
    if (simplified.length >= 2) {
      const final: Array<readonly [number, number, number]> = simplified.map(
        ([x, y]) => [x, y, 0.5] as const,
      );
      ctx.updateShape(state.id, { points: final } as Partial<Shape>);
    } else {
      ctx.removeShapes([state.id]);
    }
  }
  ctx.endCoalesce();
  return { kind: "idle" };
}

function createRectOrEllipseOnIdleClick(
  info: PointerInfo,
  ctx: ToolContext,
  type: "rect" | "ellipse",
): InteractionState {
  const initial: Omit<Shape, "id" | "z"> = type === "rect"
    ? ({
        type: "rect",
        x: info.wx,
        y: info.wy,
        rotation: 0,
        groupId: null,
        stroke: DEFAULT_STROKE,
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: DEFAULT_STROKE_WIDTH,
        width: 0,
        height: 0,
      } as Omit<RectShape, "id" | "z">)
    : ({
        type: "ellipse",
        x: info.wx,
        y: info.wy,
        rotation: 0,
        groupId: null,
        stroke: DEFAULT_STROKE,
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: DEFAULT_STROKE_WIDTH,
        width: 0,
        height: 0,
      } as Omit<EllipseShape, "id" | "z">);
  const id = ctx.addShape(initial);
  ctx.setSelection([id], false);
  ctx.beginCoalesce();
  return {
    kind: type === "rect" ? "drawing_rect" : "drawing_ellipse",
    id,
    origin: [info.wx, info.wy],
  };
}

export function rectToolOnIdleClick(info: PointerInfo, ctx: ToolContext): InteractionState {
  return createRectOrEllipseOnIdleClick(info, ctx, "rect");
}

export function ellipseToolOnIdleClick(info: PointerInfo, ctx: ToolContext): InteractionState {
  return createRectOrEllipseOnIdleClick(info, ctx, "ellipse");
}

function shapeDragOnMove(
  state: Extract<InteractionState, { kind: "drawing_rect" | "drawing_ellipse" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const w = info.wx - state.origin[0];
  const h = info.wy - state.origin[1];
  ctx.updateShape(state.id, { width: w, height: h } as Partial<Shape>);
  return state;
}

function shapeDragOnUp(
  state: Extract<InteractionState, { kind: "drawing_rect" | "drawing_ellipse" }>,
  ctx: ToolContext,
): InteractionState {
  const shape = ctx.shapes.find((s) => s.id === state.id);
  if (shape && (shape.type === "rect" || shape.type === "ellipse")) {
    const b = rectBounds({
      ...shape,
      type: "rect",
    } as RectShape);
    if (b.w < 2 && b.h < 2) {
      ctx.removeShapes([state.id]);
    }
  }
  ctx.endCoalesce();
  return { kind: "idle" };
}

export const rectDrawingOnMove = shapeDragOnMove;
export const rectDrawingOnUp = shapeDragOnUp;
export const ellipseDrawingOnMove = shapeDragOnMove;
export const ellipseDrawingOnUp = shapeDragOnUp;

export function textToolOnIdleClick(
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const initial: TextShape = {
    id: "",
    type: "text",
    x: info.wx,
    y: info.wy,
    z: 0,
    rotation: 0,
    groupId: null,
    stroke: DEFAULT_STROKE,
    fill: "transparent",
    fillPattern: "none",
    strokeWidth: 0,
    text: "",
    fontSize: 20,
  };
  const id = ctx.addShape(initial);
  ctx.setSelection([id], false);
  ctx.requestTextEdit(id);
  return { kind: "editing_text", id };
}

export function arrowToolOnIdleClick(
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const initial: ArrowShape = {
    id: "",
    type: "arrow",
    x: info.wx,
    y: info.wy,
    z: 0,
    rotation: 0,
    groupId: null,
    stroke: DEFAULT_STROKE,
    fill: "transparent",
    fillPattern: "none",
    strokeWidth: 2,
    points: [[0, 0], [0, 0]],
  };
  const id = ctx.addShape(initial);
  ctx.setSelection([id], false);
  ctx.beginCoalesce();
  return {
    kind: "drawing_arrow",
    id,
    origin: [info.wx, info.wy],
    points: [[0, 0]],
  };
}

export function arrowDrawingOnMove(
  state: Extract<InteractionState, { kind: "drawing_arrow" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const points: Array<readonly [number, number]> = [
    ...state.points,
    [info.wx - state.origin[0], info.wy - state.origin[1]],
  ];
  ctx.updateShape(state.id, { points } as Partial<Shape>);
  return { ...state, points };
}

export function arrowDrawingOnClick(
  state: Extract<InteractionState, { kind: "drawing_arrow" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const local: [number, number] = [info.wx - state.origin[0], info.wy - state.origin[1]];
  const points = [...state.points, local] as ReadonlyArray<readonly [number, number]>;
  ctx.updateShape(state.id, { points } as Partial<Shape>);
  return { ...state, points };
}

export function arrowDrawingOnDoubleClick(
  state: Extract<InteractionState, { kind: "drawing_arrow" }>,
  ctx: ToolContext,
): InteractionState {
  if (state.points.length >= 2) {
    ctx.endCoalesce();
    return { kind: "idle" };
  }
  ctx.removeShapes([state.id]);
  ctx.endCoalesce();
  return { kind: "idle" };
}

export function arrowDrawingOnKey(
  state: Extract<InteractionState, { kind: "drawing_arrow" }>,
  e: KeyboardEvent,
  ctx: ToolContext,
): InteractionState | null {
  if (e.key === "Enter") {
    if (state.points.length >= 2) {
      ctx.endCoalesce();
      return { kind: "idle" };
    }
  }
  if (e.key === "Escape") {
    ctx.removeShapes([state.id]);
    ctx.endCoalesce();
    return { kind: "idle" };
  }
  if (e.key === "Backspace" && state.points.length > 1) {
    const points = state.points.slice(0, -1);
    ctx.updateShape(state.id, { points } as Partial<Shape>);
    return { ...state, points };
  }
  return null;
}

export function eraserToolOnIdleClick(
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const hits = new Set<string>();
  for (const shape of ctx.shapes) {
    if (hitTestShape(shape, info.wx, info.wy, 6 / ctx.camera.zoom)) {
      hits.add(shape.id);
    }
  }
  ctx.beginCoalesce();
  return {
    kind: "erasing",
    hits,
    trail: [[info.wx, info.wy]],
    lockFirst: info.ctrlKey || info.metaKey,
  };
}

export function erasingOnMove(
  state: Extract<InteractionState, { kind: "erasing" }>,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  const margin = 6 / ctx.camera.zoom;
  const trail = [...state.trail];
  const last = trail[trail.length - 1] ?? [info.wx, info.wy];
  if (Math.hypot(info.wx - last[0], info.wy - last[1]) > 2 / ctx.camera.zoom) {
    trail.push([info.wx, info.wy]);
  }
  const hits = new Set(state.hits);
  const lockFirst = state.lockFirst || info.ctrlKey || info.metaKey;
  if (lockFirst) {
    if (hits.size === 0) {
      for (let i = ctx.shapes.length - 1; i >= 0; i -= 1) {
        const s = ctx.shapes[i]!;
        if (hitTestShape(s, info.wx, info.wy, margin)) {
          hits.add(s.id);
          break;
        }
      }
    }
  } else {
    for (const s of ctx.shapes) {
      if (hitTestShape(s, info.wx, info.wy, margin)) {
        hits.add(s.id);
      }
    }
  }
  return { kind: "erasing", hits, trail, lockFirst };
}

export function erasingOnUp(
  state: Extract<InteractionState, { kind: "erasing" }>,
  ctx: ToolContext,
): InteractionState {
  if (state.hits.size > 0) {
    ctx.removeShapes(Array.from(state.hits));
  }
  ctx.endCoalesce();
  return { kind: "idle" };
}

/* --- helpers used in stateMachine --- */
