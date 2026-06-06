"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type Camera,
  type FillPattern,
  type Shape,
  type Tool,
} from "./types";
import {
  arrowPath,
  getResizeHandlePositions,
  shapeBounds,
} from "./geometry";
import { getPenOutlinePath } from "./penRenderer";
import {
  dispatchDoubleClick,
  dispatchIdleClick,
  dispatchKey,
  dispatchMove,
  dispatchUp,
  getHoverInfo,
  type InteractionState,
  type PointerInfo,
} from "./stateMachine";
import type { ToolContext } from "./tools/types";
import type { SnapGuide } from "./snap";

type Props = {
  shapes: ReadonlyArray<Shape>;
  camera: Camera;
  tool: Tool;
  selectedIds: ReadonlyArray<string>;
  editingTextId: string | null;
  snapToGrid: boolean;
  snapToShapes: boolean;
  onCamera: (patch: Partial<Camera>) => void;
  onCommitShape: (partial: Omit<Shape, "id" | "z">) => string;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  onRemoveShapes: (ids: ReadonlyArray<string>) => void;
  onTranslate: (ids: ReadonlyArray<string>, dx: number, dy: number) => void;
  onSelectionChange: (ids: ReadonlyArray<string>) => void;
  onRequestTextEdit: (id: string) => void;
  onShowContextMenu: (
    point: { sx: number; sy: number; wx: number; wy: number },
    ids: ReadonlyArray<string>,
  ) => void;
  surfaceRef: RefObject<HTMLDivElement | null>;
  onContextMenuStateChange?: (open: boolean) => void;
  onSnapGuidesChange?: (guides: ReadonlyArray<SnapGuide>) => void;
};

const HANDLE_SIZE_PX = 10;
const ERASER_MARGIN = 6;

function screenToWorld(
  surface: HTMLDivElement,
  camera: Camera,
  clientX: number,
  clientY: number,
): { wx: number; wy: number; sx: number; sy: number } {
  const rect = surface.getBoundingClientRect();
  const sx = clientX - rect.left + surface.scrollLeft;
  const sy = clientY - rect.top + surface.scrollTop;
  return {
    sx,
    sy,
    wx: (sx - camera.x) / camera.zoom,
    wy: (sy - camera.y) / camera.zoom,
  };
}

function pointerInfoFromNative(e: PointerEvent, surface: HTMLDivElement, camera: Camera): PointerInfo {
  const { wx, wy, sx, sy } = screenToWorld(surface, camera, e.clientX, e.clientY);
  const coalesced: PointerInfo[] = [];
  if (typeof e.getCoalescedEvents === "function") {
    for (const c of e.getCoalescedEvents()) {
      const c2 = screenToWorld(surface, camera, c.clientX, c.clientY);
      coalesced.push({
        wx: c2.wx,
        wy: c2.wy,
        sx: c2.sx,
        sy: c2.sy,
        button: c.button,
        shiftKey: c.shiftKey,
        ctrlKey: c.ctrlKey,
        metaKey: c.metaKey,
        altKey: c.altKey,
        pointerId: c.pointerId,
        pressure: c.pressure,
        coalesced: [],
      });
    }
  }
  return {
    wx,
    wy,
    sx,
    sy,
    button: e.button,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    pointerId: e.pointerId,
    pressure: e.pressure,
    coalesced,
  };
}

export function CanvasSurface({
  shapes,
  camera,
  tool,
  selectedIds,
  editingTextId,
  snapToGrid,
  snapToShapes,
  onCamera,
  onCommitShape,
  onUpdateShape,
  onRemoveShapes,
  onTranslate,
  onSelectionChange,
  onRequestTextEdit,
  onShowContextMenu,
  surfaceRef,
  onSnapGuidesChange,
}: Props) {
  const [interaction, setInteraction] = useState<InteractionState>({ kind: "idle" });
  const [hover, setHover] = useState<{ id: string | null; handle: string | null }>({ id: null, handle: null });
  const [spaceDown, setSpaceDown] = useState(false);

  const buildCtx = useCallback(
    (): ToolContext => ({
      shapes,
      camera,
      tool,
      selection: new Set(selectedIds),
      addShape: onCommitShape,
      updateShape: onUpdateShape,
      removeShapes: onRemoveShapes,
      translateShapes: onTranslate,
      setCamera: onCamera,
      setSelection: onSelectionChange,
      setHover: (id, h) => setHover({ id, handle: h }),
      beginCoalesce: () => {},
      endCoalesce: () => {},
      requestTextEdit: onRequestTextEdit,
      showContextMenu: onShowContextMenu,
      setSnapGuides: (guides) => onSnapGuidesChange?.(guides),
      snapToGrid,
      snapToShapes,
    }),
    [
      shapes,
      camera,
      tool,
      selectedIds,
      onCommitShape,
      onUpdateShape,
      onRemoveShapes,
      onTranslate,
      onSelectionChange,
      onRequestTextEdit,
      onShowContextMenu,
      onCamera,
      onSnapGuidesChange,
      snapToGrid,
      snapToShapes,
    ],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceDown(true);
      }
      if (e.key === "Escape") {
        setInteraction({ kind: "idle" });
        onSelectionChange([]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onSelectionChange]);

  // Track global move/up events for the active interaction.
  useEffect(() => {
    if (interaction.kind === "idle") return;
    const onMove = (e: PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      const info = pointerInfoFromNative(e, surface, camera);
      setInteraction((prev) => {
        const next = dispatchMove(prev, info, buildCtx());
        return next ?? prev;
      });
    };
    const onUp = (e: PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      const info = pointerInfoFromNative(e, surface, camera);
      setInteraction((prev) => dispatchUp(prev, info, buildCtx()));
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      setInteraction((prev) => dispatchKey(prev, e, buildCtx()) ?? prev);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [interaction.kind, buildCtx, camera, surfaceRef]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      e.preventDefault();
      const surface = surfaceRef.current;
      if (!surface) return;
      if (editingTextId) return;
      const info = pointerInfoFromNative(e.nativeEvent, surface, camera);
      // Right/middle button always pans.
      if (e.button === 1 || e.button === 2) {
        const result = dispatchIdleClick({ kind: "idle" }, info, buildCtx());
        if (result.state.kind !== "idle") {
          setInteraction(result.state);
          surface.setPointerCapture(e.pointerId);
        }
        return;
      }
      // Space pan: only when not in middle of a draw.
      if (spaceDown && tool !== "pan") {
        const result = dispatchIdleClick({ kind: "idle" }, info, buildCtx());
        if (result.state.kind !== "idle") {
          setInteraction(result.state);
          surface.setPointerCapture(e.pointerId);
        }
        return;
      }
      const result = dispatchIdleClick(interaction, info, buildCtx());
      if (result.state.kind !== "idle") {
        setInteraction(result.state);
        surface.setPointerCapture(e.pointerId);
        if (result.textEdit) {
          onRequestTextEdit(result.textEdit.id);
          setInteraction({ kind: "editing_text", id: result.textEdit.id });
        }
      } else if (result.textEdit) {
        onRequestTextEdit(result.textEdit.id);
        setInteraction({ kind: "editing_text", id: result.textEdit.id });
      }
    },
    [camera, buildCtx, editingTextId, interaction, onRequestTextEdit, spaceDown, surfaceRef, tool],
  );

  const onDoubleClick = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (editingTextId) return;
      const surface = surfaceRef.current;
      if (!surface) return;
      const info = pointerInfoFromNative(e.nativeEvent, surface, camera);
      const result = dispatchDoubleClick(interaction, info, buildCtx());
      if (result.state.kind !== "idle") setInteraction(result.state);
      if (result.textEdit) {
        onRequestTextEdit(result.textEdit.id);
        setInteraction({ kind: "editing_text", id: result.textEdit.id });
      }
    },
    [buildCtx, camera, editingTextId, interaction, onRequestTextEdit, surfaceRef],
  );

  // Wheel: zoom with cmd/ctrl, pan otherwise.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left + el.scrollLeft;
        const sy = e.clientY - rect.top + el.scrollTop;
        const factor = Math.exp(-e.deltaY * 0.0025);
        const nextZoom = Math.max(0.1, Math.min(8, camera.zoom * factor));
        const wx = (sx - camera.x) / camera.zoom;
        const wy = (sy - camera.y) / camera.zoom;
        onCamera({ zoom: nextZoom, x: sx - wx * nextZoom, y: sy - wy * nextZoom });
      } else {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          el.scrollLeft += e.deltaX;
        } else {
          el.scrollLeft += e.deltaY;
          el.scrollTop += e.deltaX;
        }
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [camera, onCamera, surfaceRef]);

  // Track hover for the cursor.
  const onPointerMoveHover = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      const info = pointerInfoFromNative(e.nativeEvent, surface, camera);
      const ctx = buildCtx();
      const h = getHoverInfo(ctx, info.wx, info.wy);
      setHover({ id: h.id, handle: h.handle });
    },
    [buildCtx, camera, surfaceRef],
  );

  // Determine the visible cursor.
  const cursor = (() => {
    if (interaction.kind === "panning") return "grabbing";
    if (spaceDown && tool === "select") return "grabbing";
    if (spaceDown || tool === "pan") return "grab";
    if (hover.handle) {
      const cursors: Record<string, string> = {
        nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize",
        e: "ew-resize", se: "nwse-resize", s: "ns-resize",
        sw: "nesw-resize", w: "ew-resize",
      };
      return cursors[hover.handle] ?? "default";
    }
    if (tool === "select") return hover.id ? "move" : "default";
    if (tool === "eraser") return "cell";
    if (tool === "text") return "text";
    return "crosshair";
  })();

  // Compute selection bounds and handles.
  const selectionBounds = (() => {
    if (selectedIds.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let any = false;
    for (const id of selectedIds) {
      const s = shapes.find((sh) => sh.id === id);
      if (!s) continue;
      const b = shapeBounds(s);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
      any = true;
    }
    if (!any) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  })();

  const eraserState = interaction.kind === "erasing" ? interaction : null;
  const marqueeState = interaction.kind === "marquee" ? interaction : null;
  const editingShape =
    editingTextId
      ? shapes.find((s) => s.id === editingTextId)
      : null;

  return (
    <div
      ref={surfaceRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveHover}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      className="canvas-grid relative h-full min-h-0 w-full min-w-0 touch-none overflow-hidden select-none"
      style={{
        cursor,
        backgroundColor: "var(--color-background, #fff8f1)",
        backgroundImage:
          "linear-gradient(to right, rgba(116, 120, 120, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(116, 120, 120, 0.22) 1px, transparent 1px)",
        backgroundSize: `${24 * camera.zoom}px ${24 * camera.zoom}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
    >
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 8000,
          height: 8000,
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <svg
          width={8000}
          height={8000}
          style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}
        >
          <defs>
            <FillPatternDefs />
          </defs>
          {shapes
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((s) => (
              <ShapeRenderer
                key={s.id}
                shape={s}
                ghosted={eraserState ? eraserState.hits.has(s.id) : false}
                hovered={hover.id === s.id && tool === "select" && !selectedIds.includes(s.id)}
              />
            ))}
          {selectionBounds && tool === "select" && (
            <rect
              x={selectionBounds.x}
              y={selectionBounds.y}
              width={selectionBounds.w}
              height={selectionBounds.h}
              fill="none"
              stroke="#1e1b15"
              strokeWidth={1 / camera.zoom}
              strokeDasharray={`${4 / camera.zoom} ${4 / camera.zoom}`}
              pointerEvents="none"
            />
          )}
          {selectionBounds && tool === "select" &&
            selectedIds.length === 1 &&
            shapes.find((s) => s.id === selectedIds[0])?.type !== "pen" && (
            <ResizeHandles
              bounds={selectionBounds}
              zoom={camera.zoom}
            />
          )}
          {selectedIds.length === 1 && shapes.find((s) => s.id === selectedIds[0])?.type === "arrow" && (
            <ArrowVertexHandles
              shape={shapes.find((s) => s.id === selectedIds[0]) as import("./types").ArrowShape}
              zoom={camera.zoom}
            />
          )}
          {hover.id && tool === "select" && !selectedIds.includes(hover.id) && (() => {
            const s = shapes.find((sh) => sh.id === hover.id);
            if (!s) return null;
            const b = shapeBounds(s);
            return (
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill="none"
                stroke="#747878"
                strokeWidth={1 / camera.zoom}
                pointerEvents="none"
              />
            );
          })()}
          {marqueeState && (
            <rect
              x={Math.min(marqueeState.start[0], marqueeState.end[0])}
              y={Math.min(marqueeState.start[1], marqueeState.end[1])}
              width={Math.abs(marqueeState.end[0] - marqueeState.start[0])}
              height={Math.abs(marqueeState.end[1] - marqueeState.start[1])}
              fill="rgba(83, 102, 0, 0.08)"
              stroke="#536600"
              strokeWidth={1 / camera.zoom}
              strokeDasharray={`${4 / camera.zoom} ${4 / camera.zoom}`}
              pointerEvents="none"
            />
          )}
          {eraserState && (
            <EraserScribble
              points={eraserState.trail}
              radius={ERASER_MARGIN / camera.zoom}
            />
          )}
        </svg>
        {editingShape && editingShape.type === "text" && (
          <TextEditor
            shape={editingShape}
            onChange={(text) => onUpdateShape(editingShape.id, { text })}
            onCommit={() => onRequestTextEdit("")}
          />
        )}
      </div>
    </div>
  );
}

function ResizeHandles({
  bounds,
  zoom,
}: {
  bounds: { x: number; y: number; w: number; h: number };
  zoom: number;
}) {
  const positions = getResizeHandlePositions(bounds);
  const half = HANDLE_SIZE_PX / zoom / 2;
  return (
    <>
      {positions.map((p) => (
        <div
          key={p.handle}
          className="absolute border border-primary bg-surface"
          style={{
            left: p.x * zoom - half,
            top: p.y * zoom - half,
            width: HANDLE_SIZE_PX,
            height: HANDLE_SIZE_PX,
            cursor: p.cursor,
            backgroundColor: "#fff8f1",
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function ArrowVertexHandles({
  shape,
  zoom,
}: {
  shape: import("./types").ArrowShape;
  zoom: number;
}) {
  if (shape.points.length < 2) return null;
  const half = HANDLE_SIZE_PX / zoom / 2;
  return (
    <>
      {shape.points.map((p, i) => (
        <div
          key={i}
          className="absolute border border-primary"
          style={{
            left: (shape.x + p[0]) * zoom - half,
            top: (shape.y + p[1]) * zoom - half,
            width: HANDLE_SIZE_PX,
            height: HANDLE_SIZE_PX,
            borderRadius: "50%",
            backgroundColor: "#c9f308",
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function ShapeRenderer({
  shape,
  ghosted,
  hovered,
}: {
  shape: Shape;
  ghosted: boolean;
  hovered: boolean;
}) {
  const opacity = ghosted ? 0.25 : 1;
  const hoverOutline = hovered ? (
    <ShapeHoverOutline shape={shape} />
  ) : null;
  switch (shape.type) {
    case "pen": {
      const d = getPenOutlinePath(shape.points, shape.size);
      return (
        <g opacity={opacity}>
          {d && (
            <path
              d={d}
              fill={shape.stroke}
              transform={`translate(${shape.x} ${shape.y})`}
            />
          )}
          {hoverOutline}
        </g>
      );
    }
    case "rect": {
      const x = Math.min(shape.x, shape.x + shape.width);
      const y = Math.min(shape.y, shape.y + shape.height);
      const w = Math.abs(shape.width);
      const h = Math.abs(shape.height);
      return (
        <g opacity={opacity}>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill={resolveFill(shape.fill, shape.fillPattern)}
          />
          {hoverOutline}
        </g>
      );
    }
    case "ellipse": {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const rx = Math.abs(shape.width / 2);
      const ry = Math.abs(shape.height / 2);
      return (
        <g opacity={opacity}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill={resolveFill(shape.fill, shape.fillPattern)}
          />
          {hoverOutline}
        </g>
      );
    }
    case "text": {
      const lines = shape.text.split("\n");
      return (
        <g opacity={opacity}>
          {lines.map((line, idx) => (
            <text
              key={idx}
              x={shape.x}
              y={shape.y + (idx + 1) * shape.fontSize * 1.2}
              fontSize={shape.fontSize}
              fontFamily="var(--font-hanken-grotesk), sans-serif"
              fontWeight={500}
              fill={shape.stroke}
            >
              {line || " "}
            </text>
          ))}
          {hoverOutline}
        </g>
      );
    }
    case "arrow": {
      const { line, head } = arrowPath(shape);
      return (
        <g opacity={opacity}>
          <path
            d={line}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill="none"
            strokeLinecap="round"
            transform={`translate(${shape.x} ${shape.y})`}
          />
          <path
            d={head}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${shape.x} ${shape.y})`}
          />
          {hoverOutline}
        </g>
      );
    }
  }
}

function ShapeHoverOutline({ shape }: { shape: Shape }) {
  const b = shapeBounds(shape);
  if (b.w === 0 && b.h === 0) return null;
  return (
    <rect
      x={b.x}
      y={b.y}
      width={b.w}
      height={b.h}
      fill="none"
      stroke="#747878"
      strokeWidth={1}
      pointerEvents="none"
    />
  );
}

function EraserScribble({
  points,
  radius,
}: {
  points: ReadonlyArray<readonly [number, number]>;
  radius: number;
}) {
  if (points.length === 0) return null;
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)] ?? points[i]!;
    const cur = points[i]!;
    const next = points[Math.min(points.length - 1, i + 1)] ?? points[i]!;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    left.push([cur[0] + nx * radius, cur[1] + ny * radius]);
    right.push([cur[0] - nx * radius, cur[1] - ny * radius]);
  }
  const ring = [...left, ...right.reverse()];
  if (ring.length < 3) return null;
  const d =
    `M ${ring[0]![0]} ${ring[0]![1]} ` +
    ring.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
    " Z";
  return <path d={d} fill="rgba(186, 26, 26, 0.18)" stroke="none" pointerEvents="none" />;
}

function resolveFill(fill: string, pattern: FillPattern): string {
  if (pattern === "none") return "none";
  if (pattern === "solid") return fill;
  return `url(#fill-${pattern})`;
}

function FillPatternDefs() {
  return (
    <>
      <pattern
        id="fill-hachure"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="#1e1b15" strokeWidth="2" />
      </pattern>
      <pattern
        id="fill-cross-hatch"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="#1e1b15" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="8" y2="0" stroke="#1e1b15" strokeWidth="1.5" />
      </pattern>
      <pattern id="fill-dots" patternUnits="userSpaceOnUse" width="8" height="8">
        <circle cx="4" cy="4" r="1.4" fill="#1e1b15" />
      </pattern>
    </>
  );
}

function TextEditor({
  shape,
  onChange,
  onCommit,
}: {
  shape: import("./types").TextShape;
  onChange: (text: string) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(shape.text.length, shape.text.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id]);
  // Auto-resize to fit content.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [shape.text]);
  return (
    <textarea
      ref={ref}
      defaultValue={shape.text}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCommit();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit();
        }
      }}
      placeholder="Type something…"
      className="text-headline-md border-primary absolute resize-none border-2 focus:outline-hidden"
      style={{
        left: shape.x,
        top: shape.y - shape.fontSize * 0.2,
        fontSize: `${shape.fontSize}px`,
        lineHeight: 1.2,
        minWidth: "120px",
        color: "#1e1b15",
        fontFamily: "var(--font-hanken-grotesk), sans-serif",
        fontWeight: 500,
        background: "rgba(255, 248, 241, 0.96)",
        padding: 0,
      }}
    />
  );
}

// (no helper references needed)
