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
  type Shape,
  type Tool,
} from "./types";
import {
  arrowPath,
  distance,
  hitTestShape,
  penPath,
  shapeBounds,
} from "./geometry";

type Props = {
  shapes: ReadonlyArray<Shape>;
  camera: Camera;
  selectedId: string | null;
  tool: Tool;
  onCamera: (patch: Partial<Camera>) => void;
  onCommitShape: (shape: Shape) => string;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  onSelect: (id: string | null) => void;
  onErase: (id: string) => void;
  onBeginCoalesce: () => void;
  onEndCoalesce: () => void;
  onTextRequest: (x: number, y: number) => void;
  surfaceRef: RefObject<HTMLDivElement | null>;
};

type Drag =
  | { kind: "none" }
  | { kind: "pan"; startX: number; startY: number; startCam: Camera }
  | {
      kind: "draw";
      tempId: string;
      origin: [number, number];
      current: [number, number];
    }
  | { kind: "move"; ids: ReadonlyArray<string>; last: [number, number] }
  | { kind: "erase"; last: [number, number] };

function screenToWorld(
  surface: HTMLDivElement,
  camera: Camera,
  clientX: number,
  clientY: number,
): [number, number] {
  const rect = surface.getBoundingClientRect();
  const sx = clientX - rect.left + surface.scrollLeft;
  const sy = clientY - rect.top + surface.scrollTop;
  return [(sx - camera.x) / camera.zoom, (sy - camera.y) / camera.zoom];
}

export function CanvasSurface({
  shapes,
  camera,
  selectedId,
  tool,
  onCamera,
  onCommitShape,
  onUpdateShape,
  onSelect,
  onErase,
  onBeginCoalesce,
  onEndCoalesce,
  onTextRequest,
  surfaceRef,
}: Props) {
  const dragRef = useRef<Drag>({ kind: "none" });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceDown(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.kind === "none") return;
      const surface = surfaceRef.current;
      if (!surface) return;
      const [wx, wy] = screenToWorld(surface, camera, e.clientX, e.clientY);

      if (drag.kind === "pan") {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        onCamera({
          x: drag.startCam.x - dx,
          y: drag.startCam.y - dy,
        });
        return;
      }

      if (drag.kind === "draw") {
        if (tool === "pen") {
          const newPoint: [number, number] = [wx - drag.origin[0], wy - drag.origin[1]];
          const points = onUpdateShapeGetPoints(drag.tempId, shapes);
          const last: [number, number] = points
            ? [points[points.length - 1]![0], points[points.length - 1]![1]]
            : drag.origin;
          if (distance(last, [wx, wy]) >= 1.5) {
            const base: ReadonlyArray<readonly [number, number]> =
              points ?? [[0, 0]];
            const next: Array<[number, number]> = [
              ...base.map((p) => [p[0], p[1]] as [number, number]),
              newPoint,
            ];
            onUpdateShape(drag.tempId, { points: next } as Partial<Shape>);
          }
        } else if (tool === "rect") {
          onUpdateShape(drag.tempId, {
            width: wx - drag.origin[0],
            height: wy - drag.origin[1],
          } as Partial<Shape>);
        } else if (tool === "ellipse") {
          onUpdateShape(drag.tempId, {
            width: wx - drag.origin[0],
            height: wy - drag.origin[1],
          } as Partial<Shape>);
        } else if (tool === "arrow") {
          const points: Array<[number, number]> = [
            [0, 0],
            [wx - drag.origin[0], wy - drag.origin[1]],
          ];
          onUpdateShape(drag.tempId, { points } as Partial<Shape>);
        }
        return;
      }

      if (drag.kind === "move") {
        const dx = wx - drag.last[0];
        const dy = wy - drag.last[1];
        if (dx === 0 && dy === 0) return;
        drag.last = [wx, wy];
        for (const id of drag.ids) {
          const shape = shapes.find((s) => s.id === id);
          if (!shape) continue;
          if (shape.type === "pen" || shape.type === "arrow") {
            const next: Array<[number, number]> = shape.points.map(
              ([px, py]) => [px + dx, py + dy],
            );
            onUpdateShape(id, { points: next } as Partial<Shape>);
          } else {
            onUpdateShape(id, { x: shape.x + dx, y: shape.y + dy } as Partial<Shape>);
          }
        }
        return;
      }

      if (drag.kind === "erase") {
        const moved = distance(drag.last, [wx, wy]);
        if (moved < 4) return;
        drag.last = [wx, wy];
        for (const shape of shapes) {
          if (hitTestShape(shape, wx, wy, 6 / camera.zoom)) {
            onErase(shape.id);
          }
        }
        return;
      }
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (drag.kind === "pan") {
        setIsPanning(false);
      } else if (drag.kind !== "none") {
        onEndCoalesce();
      }
      dragRef.current = { kind: "none" };
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [
    camera,
    onCamera,
    onEndCoalesce,
    onErase,
    onUpdateShape,
    shapes,
    surfaceRef,
    tool,
  ]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.button !== 1) return;
      const surface = surfaceRef.current;
      if (!surface) return;

      if (e.button === 1 || spaceDown) {
        const [, ] = screenToWorld(surface, camera, e.clientX, e.clientY);
        setIsPanning(true);
        dragRef.current = {
          kind: "pan",
          startX: e.clientX,
          startY: e.clientY,
          startCam: camera,
        };
        surface.setPointerCapture(e.pointerId);
        return;
      }

      const [wx, wy] = screenToWorld(surface, camera, e.clientX, e.clientY);
      surface.setPointerCapture(e.pointerId);

      if (tool === "pen") {
        const shape: Shape = {
          id: "",
          type: "pen",
          x: wx,
          y: wy,
          z: 0,
          stroke: "#1e1b15",
          fill: "transparent",
          fillPattern: "none",
          strokeWidth: 2,
          points: [[0, 0]],
        };
        const id = onCommitShape(shape);
        onSelect(id);
        dragRef.current = {
          kind: "draw",
          tempId: id,
          origin: [wx, wy],
          current: [wx, wy],
        };
        onBeginCoalesce();
        return;
      }

      if (tool === "rect") {
        const shape: Shape = {
          id: "",
          type: "rect",
          x: wx,
          y: wy,
          z: 0,
          width: 0,
          height: 0,
          stroke: "#1e1b15",
          fill: "transparent",
          fillPattern: "none",
          strokeWidth: 2,
        };
        const id = onCommitShape(shape);
        onSelect(id);
        dragRef.current = {
          kind: "draw",
          tempId: id,
          origin: [wx, wy],
          current: [wx, wy],
        };
        onBeginCoalesce();
        return;
      }

      if (tool === "ellipse") {
        const shape: Shape = {
          id: "",
          type: "ellipse",
          x: wx,
          y: wy,
          z: 0,
          width: 0,
          height: 0,
          stroke: "#1e1b15",
          fill: "transparent",
          fillPattern: "none",
          strokeWidth: 2,
        };
        const id = onCommitShape(shape);
        onSelect(id);
        dragRef.current = {
          kind: "draw",
          tempId: id,
          origin: [wx, wy],
          current: [wx, wy],
        };
        onBeginCoalesce();
        return;
      }

      if (tool === "text") {
        onTextRequest(wx, wy);
        return;
      }

      if (tool === "arrow") {
        const shape: Shape = {
          id: "",
          type: "arrow",
          x: wx,
          y: wy,
          z: 0,
          stroke: "#1e1b15",
          fill: "transparent",
          fillPattern: "none",
          strokeWidth: 2,
          points: [
            [0, 0],
            [0, 0],
          ],
        };
        const id = onCommitShape(shape);
        onSelect(id);
        dragRef.current = {
          kind: "draw",
          tempId: id,
          origin: [wx, wy],
          current: [wx, wy],
        };
        onBeginCoalesce();
        return;
      }

      if (tool === "eraser") {
        for (const shape of shapes) {
          if (hitTestShape(shape, wx, wy, 8 / camera.zoom)) {
            onErase(shape.id);
          }
        }
        dragRef.current = {
          kind: "erase",
          last: [wx, wy],
        };
        onBeginCoalesce();
        return;
      }

      let hit: Shape | null = null;
      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        if (hitTestShape(shapes[i]!, wx, wy, 4 / camera.zoom)) {
          hit = shapes[i]!;
          break;
        }
      }
      if (hit) {
        const ids = [hit.id];
        onSelect(hit.id);
        dragRef.current = {
          kind: "move",
          ids,
          last: [wx, wy],
        };
        onBeginCoalesce();
      } else {
        onSelect(null);
      }
    },
    [
      camera,
      onBeginCoalesce,
      onCommitShape,
      onErase,
      onSelect,
      onTextRequest,
      shapes,
      spaceDown,
      surfaceRef,
      tool,
    ],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = surface.getBoundingClientRect();
        const sx = e.clientX - rect.left + surface.scrollLeft;
        const sy = e.clientY - rect.top + surface.scrollTop;
        const factor = Math.exp(-e.deltaY * 0.0025);
        const nextZoom = Math.max(0.2, Math.min(4, camera.zoom * factor));
        const wx = (sx - camera.x) / camera.zoom;
        const wy = (sy - camera.y) / camera.zoom;
        onCamera({
          zoom: nextZoom,
          x: sx - wx * nextZoom,
          y: sy - wy * nextZoom,
        });
      } else {
        e.preventDefault();
        surface.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
        surface.scrollTop += e.deltaY;
      }
    },
    [camera, onCamera, surfaceRef],
  );

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel, surfaceRef]);

  const selected = shapes.find((s) => s.id === selectedId) ?? null;
  const selectionBounds = selected ? shapeBounds(selected) : null;

  const cursor = isPanning
    ? "grabbing"
    : spaceDown
      ? "grab"
      : tool === "select"
        ? "default"
        : "crosshair";

  return (
    <div
      ref={surfaceRef}
      onPointerDown={onPointerDown}
      className="canvas-grid flex-1 overflow-auto"
      style={{
        cursor,
        backgroundColor: "var(--color-background, #fff8f1)",
        backgroundImage:
          "linear-gradient(to right, rgba(116, 120, 120, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(116, 120, 120, 0.1) 1px, transparent 1px)",
        backgroundSize: `${24 * camera.zoom}px ${24 * camera.zoom}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
    >
      <svg
        width="8000"
        height="8000"
        style={{
          display: "block",
          minWidth: "100%",
          minHeight: "100%",
        }}
      >
        <defs>
          <FillPatternDefs />
        </defs>
        <g
          transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}
        >
          {shapes.map((s) => (
            <ShapeRenderer key={s.id} shape={s} />
          ))}
          {selectionBounds && tool === "select" && (
            <rect
              x={selectionBounds.x - 4 / camera.zoom}
              y={selectionBounds.y - 4 / camera.zoom}
              width={selectionBounds.w + 8 / camera.zoom}
              height={selectionBounds.h + 8 / camera.zoom}
              fill="none"
              stroke="#536600"
              strokeWidth={1.5 / camera.zoom}
              strokeDasharray={`${4 / camera.zoom} ${4 / camera.zoom}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
    </div>
  );
}

function ShapeRenderer({ shape }: { shape: Shape }) {
  switch (shape.type) {
    case "pen": {
      const d = penPath(shape.points);
      return (
        <path
          d={d}
          transform={`translate(${shape.x} ${shape.y})`}
          fill="none"
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    case "rect": {
      const x = Math.min(shape.x, shape.x + shape.width);
      const y = Math.min(shape.y, shape.y + shape.height);
      const w = Math.abs(shape.width);
      const h = Math.abs(shape.height);
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          fill={resolveFill(shape.fill, shape.fillPattern)}
        />
      );
    }
    case "ellipse": {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const rx = Math.abs(shape.width / 2);
      const ry = Math.abs(shape.height / 2);
      return (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          fill={resolveFill(shape.fill, shape.fillPattern)}
        />
      );
    }
    case "text": {
      const lines = shape.text.split("\n");
      return (
        <g>
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
        </g>
      );
    }
    case "arrow": {
      const { line, head } = arrowPath(shape);
      return (
        <g transform={`translate(${shape.x} ${shape.y})`}>
          <path
            d={line}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={head}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    }
  }
}

function resolveFill(fill: string, pattern: Shape["fillPattern"]): string {
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

function onUpdateShapeGetPoints(
  id: string,
  shapes: ReadonlyArray<Shape>,
): ReadonlyArray<readonly [number, number]> | null {
  const s = shapes.find((shape) => shape.id === id);
  if (!s) return null;
  if (s.type === "pen" || s.type === "arrow") return s.points;
  return null;
}
