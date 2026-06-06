"use client";

import React from "react";
import Konva from "konva";
import { type KonvaEventObject, type Node as KonvaNode } from "konva/lib/Node";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Arrow,
  Ellipse,
  Layer,
  Path,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer,
} from "react-konva";

import { getPenPathData } from "./penPath";
import type { SceneApi } from "./store";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  type ArrowShape,
  type EllipseShape,
  type PenShape,
  type RectShape,
  type Shape,
  type TextShape,
  type Tool,
  type ToolDefaults,
} from "./types";

type Props = {
  api: SceneApi;
  tool: Tool;
  selectedIds: ReadonlyArray<string>;
  setSelectedIds: (ids: ReadonlyArray<string>, additive?: boolean) => void;
  toolDefaults: ToolDefaults;
  onToolChange: (tool: Tool) => void;
  onRequestTextEdit: (id: string) => void;
  onContextMenuEvent: (
    point: { sx: number; sy: number; wx: number; wy: number },
    ids: ReadonlyArray<string>,
  ) => void;
  containerRef: RefObject<HTMLDivElement | null>;
};

const GRID_SIZE = 24;
const ARROW_HEAD_SIZE = 12;
const ERASER_TOLERANCE_SCREEN_PX = 6;

const TRANSFORMER_ANCHORS: string[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];
const TRANSFORMER_PROPS = {
  rotateEnabled: true,
  keepRatio: false,
  ignoreStroke: true,
  anchorSize: 8,
  anchorStroke: "#1e1b15",
  anchorFill: "#fff8f1",
  borderStroke: "#1e1b15",
  borderDash: [4, 4],
  enabledAnchors: TRANSFORMER_ANCHORS,
  strokeScaleEnabled: false,
};

export function KonvaCanvas({
  api,
  tool,
  selectedIds,
  setSelectedIds,
  toolDefaults,
  onToolChange,
  onRequestTextEdit,
  onContextMenuEvent,
  containerRef,
}: Props) {
  const { scene } = api;
  const [stageSize, setStageSize] = useState({ w: 1, h: 1 });
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, KonvaNode>>(new Map());

  // Live pen/rect/ellipse/arrow state lives in refs so high-frequency
  // pointermove events do not cause React re-renders.
  const livePenRef = useRef<{
    id: string;
    origin: { x: number; y: number };
    points: Array<[number, number, number]>;
  } | null>(null);
  const liveArrowRef = useRef<{
    id: string;
    origin: { x: number; y: number };
    points: Array<[number, number]>;
  } | null>(null);
  const liveRectRef = useRef<{
    id: string;
    originX: number;
    originY: number;
  } | null>(null);

  const orderedShapes = useMemo(
    () => scene.shapes.slice().sort((a, b) => a.z - b.z),
    [scene.shapes],
  );

  // Observe container size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const set = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // Sync transformer to selected nodes (re-runs on selection change).
  useLayoutEffect(() => {
    const tr = transformerRef.current;
    const nodes: KonvaNode[] = [];
    for (const id of selectedIds) {
      const n = nodeRefs.current.get(id);
      if (n) nodes.push(n);
    }
    if (tr) {
      tr.nodes(nodes);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }
  }, [selectedIds]);

  // Helpers ---------------------------------------------------------------
  const getWorldPoint = useCallback((sx: number, sy: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point({ x: sx, y: sy });
  }, []);

  const hitTopShape = useCallback(
    (wx: number, wy: number, tolerance: number): Shape | null => {
      for (let i = orderedShapes.length - 1; i >= 0; i -= 1) {
        const s = orderedShapes[i]!;
        if (hitShapeExpanded(s, wx, wy, tolerance)) return s;
      }
      return null;
    },
    [orderedShapes],
  );

  // Drawing tool actions -------------------------------------------------
  const beginPen = useCallback(
    (wx: number, wy: number) => {
      const id = api.addShape({
        type: "pen",
        x: wx,
        y: wy,
        rotation: 0,
        groupId: null,
        stroke: toolDefaults.stroke,
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: 0,
        size: toolDefaults.penSize,
        points: [[0, 0, 0.5]],
      } as Omit<PenShape, "id" | "z">);
      livePenRef.current = {
        id,
        origin: { x: wx, y: wy },
        points: [[0, 0, 0.5]],
      };
      api.beginCoalesce();
      setSelectedIds([id], false);
    },
    [api, toolDefaults, setSelectedIds],
  );

  const extendPen = useCallback((wx: number, wy: number) => {
    const live = livePenRef.current;
    if (!live) return;
    live.points.push([wx - live.origin.x, wy - live.origin.y, 0.5]);
  }, []);

  const endPen = useCallback(() => {
    const live = livePenRef.current;
    if (!live) return;
    api.updateShape(live.id, { points: live.points });
    api.endCoalesce();
    livePenRef.current = null;
  }, [api]);

  const beginRect = useCallback(
    (wx: number, wy: number) => {
      const id = api.addShape({
        type: "rect",
        x: wx,
        y: wy,
        rotation: 0,
        groupId: null,
        stroke: toolDefaults.stroke,
        fill: toolDefaults.fill,
        fillPattern: toolDefaults.fillPattern,
        strokeWidth: toolDefaults.strokeWidth,
        width: 0,
        height: 0,
      } as Omit<RectShape, "id" | "z">);
      liveRectRef.current = { id, originX: wx, originY: wy };
      api.beginCoalesce();
      setSelectedIds([id], false);
    },
    [api, toolDefaults, setSelectedIds],
  );

  const beginEllipse = useCallback(
    (wx: number, wy: number) => {
      const id = api.addShape({
        type: "ellipse",
        x: wx,
        y: wy,
        rotation: 0,
        groupId: null,
        stroke: toolDefaults.stroke,
        fill: toolDefaults.fill,
        fillPattern: toolDefaults.fillPattern,
        strokeWidth: toolDefaults.strokeWidth,
        width: 0,
        height: 0,
      } as Omit<EllipseShape, "id" | "z">);
      liveRectRef.current = { id, originX: wx, originY: wy };
      api.beginCoalesce();
      setSelectedIds([id], false);
    },
    [api, toolDefaults, setSelectedIds],
  );

  const extendRect = useCallback(
    (wx: number, wy: number) => {
      const live = liveRectRef.current;
      if (!live) return;
      const x = Math.min(live.originX, wx);
      const y = Math.min(live.originY, wy);
      const w = Math.abs(wx - live.originX);
      const h = Math.abs(wy - live.originY);
      api.updateShape(live.id, { x, y, width: w, height: h });
    },
    [api],
  );

  const endRect = useCallback(() => {
    liveRectRef.current = null;
    api.endCoalesce();
  }, [api]);

  const beginArrow = useCallback(
    (wx: number, wy: number) => {
      const id = api.addShape({
        type: "arrow",
        x: wx,
        y: wy,
        rotation: 0,
        groupId: null,
        stroke: toolDefaults.stroke,
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: Math.max(2, toolDefaults.strokeWidth),
        points: [[0, 0]],
      } as Omit<ArrowShape, "id" | "z">);
      liveArrowRef.current = {
        id,
        origin: { x: wx, y: wy },
        points: [[0, 0]],
      };
      api.beginCoalesce();
      setSelectedIds([id], false);
    },
    [api, toolDefaults, setSelectedIds],
  );

  const extendArrow = useCallback(
    (wx: number, wy: number) => {
      const live = liveArrowRef.current;
      if (!live) return;
      live.points.push([wx - live.origin.x, wy - live.origin.y]);
      api.updateShape(live.id, { points: live.points });
    },
    [api],
  );

  const endArrow = useCallback(() => {
    liveArrowRef.current = null;
    api.endCoalesce();
  }, [api]);

  const beginText = useCallback(
    (wx: number, wy: number) => {
      const id = api.addShape({
        type: "text",
        x: wx,
        y: wy,
        rotation: 0,
        groupId: null,
        stroke: toolDefaults.stroke,
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: 0,
        text: "",
        fontSize: toolDefaults.fontSize,
      } as Omit<TextShape, "id" | "z">);
      onRequestTextEdit(id);
    },
    [api, toolDefaults, onRequestTextEdit],
  );

  const eraserTolerance = ERASER_TOLERANCE_SCREEN_PX / scene.camera.zoom;

  const beginErase = useCallback(
    (wx: number, wy: number) => {
      const hit = hitTopShape(wx, wy, eraserTolerance);
      if (hit) api.removeShapes([hit.id]);
    },
    [api, hitTopShape, eraserTolerance],
  );

  const extendErase = useCallback(
    (wx: number, wy: number) => {
      const hits: Array<string> = [];
      for (const s of orderedShapes) {
        if (hitShapeExpanded(s, wx, wy, eraserTolerance)) hits.push(s.id);
      }
      if (hits.length > 0) api.removeShapes(hits);
    },
    [api, orderedShapes, eraserTolerance],
  );

  // Live pen update: rAF-throttled writes. Runs only while a pen stroke is
  // in progress.
  useEffect(() => {
    if (!livePenRef.current) return;
    let raf = 0;
    const tick = () => {
      const live = livePenRef.current;
      if (!live) return;
      api.updateShape(live.id, { points: live.points });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // Pan via stage drag (pan tool).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.draggable(tool === "pan");
  }, [tool]);

  // Stage event handlers --------------------------------------------------
  const onStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const native = e.evt as MouseEvent | TouchEvent;
      const isRight = "button" in native && (native as MouseEvent).button === 2;
      const pointer = stage.getPointerPosition();
      if (!pointer || isRight) return;
      const wp = getWorldPoint(pointer.x, pointer.y);

      if (tool === "pen") {
        beginPen(wp.x, wp.y);
        return;
      }
      if (tool === "rect") {
        beginRect(wp.x, wp.y);
        return;
      }
      if (tool === "ellipse") {
        beginEllipse(wp.x, wp.y);
        return;
      }
      if (tool === "arrow") {
        beginArrow(wp.x, wp.y);
        return;
      }
      if (tool === "text") {
        beginText(wp.x, wp.y);
        onToolChange("select");
        return;
      }
      if (tool === "eraser") {
        beginErase(wp.x, wp.y);
        return;
      }
      if (tool === "pan") return;

      // Select tool: hit-test top shape.
      const shapeNode = findShapeNode(e.target);
      if (shapeNode) {
        const id = shapeNode.id();
        if (selectedIds.includes(id)) return;
        const additive =
          "shiftKey" in native && (native as MouseEvent).shiftKey;
        setSelectedIds([id], additive);
      } else {
        setSelectedIds([], false);
      }
    },
    [
      tool,
      getWorldPoint,
      beginPen,
      beginRect,
      beginEllipse,
      beginArrow,
      beginText,
      onToolChange,
      beginErase,
      setSelectedIds,
      selectedIds,
    ],
  );

  const onStageMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const wp = getWorldPoint(pointer.x, pointer.y);

    if (livePenRef.current) {
      extendPen(wp.x, wp.y);
      return;
    }
    if (liveRectRef.current) {
      extendRect(wp.x, wp.y);
      return;
    }
    if (liveArrowRef.current) {
      extendArrow(wp.x, wp.y);
      return;
    }
    if (tool === "eraser") {
      extendErase(wp.x, wp.y);
    }
  }, [getWorldPoint, extendPen, extendRect, extendArrow, extendErase, tool]);

  const onStageMouseUp = useCallback(() => {
    if (livePenRef.current) endPen();
    if (liveRectRef.current) endRect();
    if (liveArrowRef.current) endArrow();
  }, [endPen, endRect, endArrow]);

  const onStageDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    api.setCamera({ x: stage.x(), y: stage.y() });
  }, [api]);

  const onShapeDragEnd = useCallback(
    (id: string) => (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      api.updateShape(id, { x: node.x(), y: node.y() });
    },
    [api],
  );

  const onWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const oldZoom = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldUnderPointer = {
        x: (pointer.x - stage.x()) / oldZoom,
        y: (pointer.y - stage.y()) / oldZoom,
      };
      const isZoom = e.evt.ctrlKey || e.evt.metaKey;
      if (isZoom) {
        const direction = e.evt.deltaY < 0 ? 1 : -1;
        const factor = 1 + direction * 0.08;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
        api.setCamera({
          zoom: newZoom,
          x: pointer.x - worldUnderPointer.x * newZoom,
          y: pointer.y - worldUnderPointer.y * newZoom,
        });
      } else {
        api.setCamera({
          x: stage.x() - e.evt.deltaX,
          y: stage.y() - e.evt.deltaY,
        });
      }
    },
    [api],
  );

  const onContextMenu = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const wp = getWorldPoint(pointer.x, pointer.y);
      const target = findShapeNode(e.target);
      let ids = selectedIds;
      if (target) {
        const id = target.id();
        if (!selectedIds.includes(id)) {
          ids = [id];
          setSelectedIds(ids, false);
        }
      }
      onContextMenuEvent(
        { sx: pointer.x, sy: pointer.y, wx: wp.x, wy: wp.y },
        ids,
      );
    },
    [getWorldPoint, onContextMenuEvent, selectedIds, setSelectedIds],
  );

  const onShapeDblClick = useCallback(
    (id: string) => (e: KonvaEventObject<MouseEvent>) => {
      const s = api.scene.shapes.find((sh) => sh.id === id);
      if (s?.type === "text") {
        e.cancelBubble = true;
        onRequestTextEdit(id);
      }
    },
    [api.scene.shapes, onRequestTextEdit],
  );

  const isDrawing = tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "arrow" || tool === "eraser";
  const stageStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: "#fff8f1",
      backgroundImage:
        "linear-gradient(to right, rgba(30, 27, 21, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 27, 21, 0.08) 1px, transparent 1px)",
      backgroundSize: `${GRID_SIZE * scene.camera.zoom}px ${GRID_SIZE * scene.camera.zoom}px`,
      backgroundPosition: `${scene.camera.x}px ${scene.camera.y}px`,
      cursor: cursorForTool(tool, selectedIds.length > 0),
    }),
    [
      scene.camera.zoom,
      scene.camera.x,
      scene.camera.y,
      tool,
      selectedIds.length,
    ],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={stageStyle}
    >
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        x={scene.camera.x}
        y={scene.camera.y}
        scaleX={scene.camera.zoom}
        scaleY={scene.camera.zoom}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onTouchStart={onStageMouseDown}
        onTouchMove={onStageMouseMove}
        onTouchEnd={onStageMouseUp}
        onDragEnd={onStageDragEnd}
        onWheel={onWheel}
        onContextMenu={onContextMenu as unknown as (e: KonvaEventObject<PointerEvent>) => void}
      >
        <Layer>
          {orderedShapes.map((shape) => (
            <ShapeNode
              key={shape.id}
              shape={shape}
              isDraggable={tool === "select" && !isDrawing}
              registerNode={(n) => {
                if (n) nodeRefs.current.set(shape.id, n);
                else nodeRefs.current.delete(shape.id);
              }}
              onDragEnd={onShapeDragEnd(shape.id)}
              onDblClick={onShapeDblClick(shape.id)}
            />
          ))}
          {selectedIds.length > 0 && tool === "select" && (
            <CanvasTransformer
              ref={transformerRef}
              onTransformEnd={(tr) => {
                tr.getNodes().forEach((node) => {
                  const id = node.id();
                  if (!id) return;
                  const shape = api.scene.shapes.find((s) => s.id === id);
                  if (!shape) return;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  const rotation = node.rotation();
                  if (shape.type === "rect" || shape.type === "ellipse") {
                    api.updateShape(id, {
                      x: node.x(),
                      y: node.y(),
                      rotation,
                      width: Math.max(1, shape.width * scaleX),
                      height: Math.max(1, shape.height * scaleY),
                    });
                  } else if (shape.type === "arrow") {
                    api.updateShape(id, {
                      x: node.x(),
                      y: node.y(),
                      rotation,
                      points: shape.points.map(
                        (p) => [p[0] * scaleX, p[1] * scaleY] as const,
                      ),
                    });
                  } else if (shape.type === "pen") {
                    const points = shape.points.map(
                      (p) =>
                        [p[0] * scaleX, p[1] * scaleY, p[2]] as readonly [
                          number,
                          number,
                          number,
                        ],
                    );
                    api.updateShape(id, {
                      x: node.x(),
                      y: node.y(),
                      rotation,
                      points,
                    });
                  } else {
                    api.updateShape(id, {
                      x: node.x(),
                      y: node.y(),
                      rotation,
                    });
                  }
                });
                // Reset scale on the Konva nodes after the next paint so the
                // re-render from updateShape() doesn't snap the node back to
                // its pre-reset visual state.
                requestAnimationFrame(() => {
                  tr.getNodes().forEach((node) => {
                    node.scaleX(1);
                    node.scaleY(1);
                  });
                  tr.forceUpdate();
                });
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

// ---------------------------------------------------------------------
// Shape renderer
// ---------------------------------------------------------------------
const ShapeNode = React.memo(function ShapeNode({
  shape,
  isDraggable,
  registerNode,
  onDragEnd,
  onDblClick,
}: {
  shape: Shape;
  isDraggable: boolean;
  registerNode: (n: KonvaNode | null) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onDblClick: (e: KonvaEventObject<MouseEvent>) => void;
}) {
  const cancelMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
    },
    [],
  );
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    draggable: isDraggable,
    strokeScaleEnabled: false,
    onDragEnd,
    onDblClick,
    onMouseDown: cancelMouseDown,
  };

  const penData = useMemo(
    () =>
      shape.type === "pen"
        ? getPenPathData(shape.points, shape.size)
        : "",
    [shape],
  );
  const arrowData = useMemo(
    () =>
      shape.type === "arrow" ? flatArrowPoints(shape.points) : [],
    [shape],
  );
  const ellipseOffsets = useMemo(
    () =>
      shape.type === "ellipse"
        ? {
            rx: Math.abs(shape.width) / 2,
            ry: Math.abs(shape.height) / 2,
            cx: shape.width >= 0 ? shape.width / 2 : -shape.width / 2,
            cy: shape.height >= 0 ? shape.height / 2 : -shape.height / 2,
          }
        : null,
    [shape],
  );

  if (shape.type === "rect") {
    return (
      <Rect
        {...commonProps}
        ref={registerNode as unknown as (n: Konva.Rect | null) => void}
        width={shape.width}
        height={shape.height}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        fill={shape.fill}
        listening
      />
    );
  }
  if (shape.type === "ellipse" && ellipseOffsets) {
    return (
      <Ellipse
        {...commonProps}
        ref={registerNode as unknown as (n: Konva.Ellipse | null) => void}
        x={shape.x + ellipseOffsets.cx}
        y={shape.y + ellipseOffsets.cy}
        radiusX={ellipseOffsets.rx}
        radiusY={ellipseOffsets.ry}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        fill={shape.fill}
        listening
      />
    );
  }
  if (shape.type === "arrow") {
    return (
      <Arrow
        {...commonProps}
        ref={registerNode as unknown as (n: Konva.Arrow | null) => void}
        points={arrowData}
        stroke={shape.stroke}
        fill={shape.stroke}
        strokeWidth={shape.strokeWidth}
        pointerLength={ARROW_HEAD_SIZE}
        pointerWidth={ARROW_HEAD_SIZE}
        lineCap="round"
        lineJoin="round"
        listening
      />
    );
  }
  if (shape.type === "pen") {
    if (!penData) {
      return (
        <Path
          {...commonProps}
          ref={registerNode as unknown as (n: Konva.Path | null) => void}
          data={circlePath(Math.max(1, shape.size / 2))}
          fill={shape.stroke}
        />
      );
    }
    return (
      <Path
        {...commonProps}
        ref={registerNode as unknown as (n: Konva.Path | null) => void}
        data={penData}
        fill={shape.stroke}
        listening
      />
    );
  }
  if (shape.type === "text") {
    return (
      <KonvaText
        {...commonProps}
        ref={registerNode as unknown as (n: Konva.Text | null) => void}
        text={shape.text || " "}
        fontSize={shape.fontSize}
        fontFamily="Hanken Grotesk, sans-serif"
        fontStyle="500"
        fill={shape.stroke}
        lineHeight={1.2}
        listening
      />
    );
  }
  return null;
});

const CanvasTransformer = React.memo(
  React.forwardRef<Konva.Transformer, { onTransformEnd: (tr: Konva.Transformer) => void }>(
    function CanvasTransformer({ onTransformEnd }, ref) {
      return (
        <Transformer
          ref={ref}
          {...TRANSFORMER_PROPS}
          onTransformEnd={(e) => {
            onTransformEnd(e.target as unknown as Konva.Transformer);
          }}
        />
      );
    },
  ),
);

function circlePath(r: number): string {
  return `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
}

function flatArrowPoints(
  points: ReadonlyArray<readonly [number, number]>,
): number[] {
  const out: number[] = [];
  for (const p of points) {
    out.push(p[0], p[1]);
  }
  return out;
}

function findShapeNode(
  target: KonvaNode | null | undefined,
): KonvaNode | null {
  let n: KonvaNode | null = target ?? null;
  while (n && !isShapeNode(n)) n = n.getParent();
  return n;
}

function isShapeNode(n: KonvaNode): boolean {
  if (
    !(n instanceof Konva.Rect) &&
    !(n instanceof Konva.Ellipse) &&
    !(n instanceof Konva.Arrow) &&
    !(n instanceof Konva.Path) &&
    !(n instanceof Konva.Text) &&
    !(n instanceof Konva.Line)
  ) {
    return false;
  }
  const id = n.id();
  return (
    typeof id === "string" && id.length > 0 && !id.startsWith("__")
  );
}

function hitShapeExpanded(
  shape: Shape,
  wx: number,
  wy: number,
  tolerance: number,
): boolean {
  const local = inverseTransform(wx, wy, shape.x, shape.y, shape.rotation);
  const lx = local.x;
  const ly = local.y;
  if (shape.type === "rect") {
    return lx >= 0 && lx <= shape.width && ly >= 0 && ly <= shape.height;
  }
  if (shape.type === "ellipse") {
    const rx = Math.abs(shape.width) / 2;
    const ry = Math.abs(shape.height) / 2;
    const cx = shape.width >= 0 ? rx : -rx;
    const cy = shape.height >= 0 ? ry : -ry;
    const nx = (lx - cx) / Math.max(rx, 0.0001);
    const ny = (ly - cy) / Math.max(ry, 0.0001);
    return nx * nx + ny * ny <= 1.0;
  }
  if (shape.type === "text") {
    const h = shape.fontSize * 1.2;
    return lx >= 0 && lx <= 240 && ly >= -shape.fontSize && ly <= h - shape.fontSize;
  }
  if (shape.type === "pen") {
    return pointInPen(shape, lx, ly, tolerance);
  }
  if (shape.type === "arrow") {
    return pointInArrow(shape, lx, ly, tolerance);
  }
  return false;
}

function inverseTransform(
  x: number,
  y: number,
  tx: number,
  ty: number,
  rotation: number,
): { x: number; y: number } {
  const dx = x - tx;
  const dy = y - ty;
  const r = (rotation * Math.PI) / 180;
  const cos = Math.cos(-r);
  const sin = Math.sin(-r);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function pointInPen(
  shape: PenShape,
  lx: number,
  ly: number,
  tolerance: number,
): boolean {
  const radius = shape.size / 2 + tolerance;
  if (shape.points.length === 0) return false;
  if (shape.points.length === 1) {
    const p = shape.points[0]!;
    return Math.hypot(lx - p[0], ly - p[1]) <= radius;
  }
  for (let i = 1; i < shape.points.length; i += 1) {
    const a = shape.points[i - 1]!;
    const b = shape.points[i]!;
    if (distanceToSegment(lx, ly, a[0], a[1], b[0], b[1]) <= radius) return true;
  }
  return false;
}

function pointInArrow(
  shape: ArrowShape,
  lx: number,
  ly: number,
  tolerance: number,
): boolean {
  if (shape.points.length < 2) return false;
  const w = shape.strokeWidth + tolerance;
  for (let i = 1; i < shape.points.length; i += 1) {
    const a = shape.points[i - 1]!;
    const b = shape.points[i]!;
    if (distanceToSegment(lx, ly, a[0], a[1], b[0], b[1]) <= w) return true;
  }
  const last = shape.points[shape.points.length - 1]!;
  const prev = shape.points[shape.points.length - 2]!;
  const head = ARROW_HEAD_SIZE;
  const dx = last[0] - prev[0];
  const dy = last[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const baseX = last[0] - ux * head;
  const baseY = last[1] - uy * head;
  const px = -uy;
  const py = ux;
  const a1x = baseX + px * head * 0.6;
  const a1y = baseY + py * head * 0.6;
  const a2x = baseX - px * head * 0.6;
  const a2y = baseY - py * head * 0.6;
  return pointInTriangle(lx, ly, a1x, a1y, last[0], last[1], a2x, a2y);
}

function pointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function cursorForTool(tool: Tool, hasSelection: boolean): string {
  switch (tool) {
    case "pan":
      return "grab";
    case "pen":
    case "rect":
    case "ellipse":
    case "arrow":
    case "text":
      return "crosshair";
    case "eraser":
      return "cell";
    case "select":
    default:
      return hasSelection ? "move" : "default";
  }
}
