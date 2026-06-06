import type { ResizeHandle } from "./types";
import type { InteractionState, PointerInfo, ToolContext } from "./tools/types";
import {
  arrowDrawingOnClick,
  arrowDrawingOnDoubleClick,
  arrowDrawingOnKey,
  arrowDrawingOnMove,
  arrowToolOnIdleClick,
  computeGroupBounds,
  ellipseDrawingOnMove,
  ellipseDrawingOnUp,
  ellipseToolOnIdleClick,
  erasingOnMove,
  erasingOnUp,
  eraserToolOnIdleClick,
  getHandleAt,
  marqueeOnMove,
  marqueeOnUp,
  panToolOnIdleClick,
  panningOnMove,
  panningOnUp,
  penDrawingOnMove,
  penDrawingOnUp,
  penToolOnIdleClick,
  rectDrawingOnMove,
  rectDrawingOnUp,
  rectToolOnIdleClick,
  resizingOnMove,
  resizingOnUp,
  selectToolOnDoubleClick,
  selectToolOnIdleClick,
  textToolOnIdleClick,
  topmostHit,
  translatingOnMove,
  translatingOnUp,
} from "./tools/handlers";

export type { InteractionState } from "./tools/types";
export type { PointerInfo } from "./tools/types";
export type { ToolContext } from "./tools/types";

export type OnIdleResult =
  | { kind: "stay" }
  | { kind: "set"; state: InteractionState }
  | { kind: "editText"; id: string };

export function dispatchIdleClick(
  state: InteractionState,
  info: PointerInfo,
  ctx: ToolContext,
): { state: InteractionState; textEdit?: { id: string } } {
  if (state.kind !== "idle") return { state };
  let next: InteractionState | null = null;
  let textEdit: { id: string } | undefined;

  if (info.button === 1 || info.button === 2) {
    next = panToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "pan") {
    next = panToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "select") {
    next = selectToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "pen") {
    next = penToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "rect") {
    next = rectToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "ellipse") {
    next = ellipseToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "text") {
    const hit = topmostHit(ctx, info.wx, info.wy, 4 / ctx.camera.zoom);
    if (hit && hit.type === "text") {
      textEdit = { id: hit.id };
      ctx.setSelection([hit.id], false);
      next = { kind: "editing_text", id: hit.id };
    } else {
      next = textToolOnIdleClick(info, ctx);
      const st = next as Extract<InteractionState, { kind: "editing_text" }>;
      textEdit = { id: st.id };
    }
  } else if (ctx.tool === "arrow") {
    next = arrowToolOnIdleClick(info, ctx);
  } else if (ctx.tool === "eraser") {
    next = eraserToolOnIdleClick(info, ctx);
  }

  if (next) return { state: next, textEdit };
  return { state };
}

export function dispatchDoubleClick(
  state: InteractionState,
  info: PointerInfo,
  ctx: ToolContext,
): { state: InteractionState; textEdit?: { id: string } } {
  if (state.kind !== "idle") {
    if (state.kind === "drawing_arrow") {
      return {
        state: arrowDrawingOnDoubleClick(state, ctx),
      };
    }
    return { state };
  }
  if (ctx.tool !== "select") return { state };
  const next = selectToolOnDoubleClick(info, ctx);
  if (next) {
    return { state: next, textEdit: { id: (next as Extract<InteractionState, { kind: "editing_text" }>).id } };
  }
  return { state };
}

export function dispatchMove(
  state: InteractionState,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  switch (state.kind) {
    case "idle":
      return state;
    case "panning":
      return panningOnMove(state, info, ctx);
    case "marquee":
      return marqueeOnMove(state, info);
    case "translating":
      return translatingOnMove(state, info, ctx);
    case "resizing":
      return resizingOnMove(state, info, ctx);
    case "drawing_pen":
      return penDrawingOnMove(state, info, ctx);
    case "drawing_rect":
      return rectDrawingOnMove(state, info, ctx);
    case "drawing_ellipse":
      return ellipseDrawingOnMove(state, info, ctx);
    case "drawing_arrow":
      return arrowDrawingOnMove(state, info, ctx);
    case "erasing":
      return erasingOnMove(state, info, ctx);
    case "editing_text":
      return state;
  }
}

export function dispatchUp(
  state: InteractionState,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  switch (state.kind) {
    case "idle":
      return state;
    case "panning":
      return panningOnUp();
    case "marquee":
      return marqueeOnUp(state, ctx);
    case "translating":
      return translatingOnUp();
    case "resizing":
      return resizingOnUp(ctx);
    case "drawing_pen":
      return penDrawingOnUp(state, ctx);
    case "drawing_rect":
      return rectDrawingOnUp(state, ctx);
    case "drawing_ellipse":
      return ellipseDrawingOnUp(state, ctx);
    case "drawing_arrow":
      return { kind: "idle" };
    case "erasing":
      return erasingOnUp(state, ctx);
    case "editing_text":
      return state;
  }
}

export function dispatchClick(
  state: InteractionState,
  info: PointerInfo,
  ctx: ToolContext,
): InteractionState {
  if (state.kind === "drawing_arrow") {
    return arrowDrawingOnClick(state, info, ctx);
  }
  return state;
}

export function dispatchKey(
  state: InteractionState,
  e: KeyboardEvent,
  ctx: ToolContext,
): InteractionState {
  if (state.kind === "drawing_arrow") {
    return arrowDrawingOnKey(state, e, ctx) ?? state;
  }
  return state;
}

export function getHoverInfo(
  ctx: ToolContext,
  x: number,
  y: number,
): { id: string | null; handle: ResizeHandle | null } {
  if (ctx.tool === "select" && ctx.selection.size > 0) {
    const hit = getHandleAt(ctx, x, y);
    if (hit && hit.handle) {
      return { id: hit.id, handle: hit.handle };
    }
  }
  const shape = topmostHit(ctx, x, y, 4 / ctx.camera.zoom);
  return { id: shape ? shape.id : null, handle: null };
}

export { computeGroupBounds };
