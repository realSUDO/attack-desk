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
  useSyncExternalStore,
} from "react";
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Layer,
  Path,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer,
} from "react-konva";

import { getFillPatternImage } from "./fillPattern";
import { getPenPathData } from "./penPath";
import { schoolbell } from "@/lib/fonts";
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
  onRequestTextEdit: (
    shape: Pick<
      TextShape,
      "id" | "x" | "y" | "text" | "fontSize" | "width" | "align" | "stroke"
    >,
    isNew?: boolean,
  ) => void;
  onContextMenuEvent: (
    point: { sx: number; sy: number; wx: number; wy: number },
    ids: ReadonlyArray<string>,
  ) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
  editingTextId: string | null;
  onDrawingEnd?: () => void;
};

const GRID_SIZE = 24;
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
const TEXT_TRANSFORMER_ANCHORS: string[] = [
  "top-left",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-right",
];
const TRANSFORMER_PROPS = {
  rotateEnabled: true,
  keepRatio: false,
  flipEnabled: false,
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
  onRequestTextEdit,
  onContextMenuEvent,
  containerRef,
  stageRef,
  editingTextId,
  onDrawingEnd,
}: Props) {
  const { scene } = api;
  const setCamera = api.setCamera;
  const updateShape = api.updateShape;
  const [stageSize, setStageSize] = useState({ w: 1, h: 1 });
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, KonvaNode>>(new Map());
  const cameraCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const transformAnchorRef = useRef<string | null>(null);

  // Tracks whether eraser button is held so we only erase on click/drag,
  // not on hover.
  const isErasingRef = useRef(false);

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
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Marquee (drag-to-select rectangle) state.
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const marqueeRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [magnetTarget, setMagnetTarget] = useState<{
    shapeId: string;
    point: { x: number; y: number };
  } | null>(null);
  const magnetTargetRef = useRef(magnetTarget);
  magnetTargetRef.current = magnetTarget;
  const dragGroupRef = useRef<{ startWx: number; startWy: number } | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const orderedShapes = useMemo(
    () => scene.shapes.slice().sort((a, b) => a.z - b.z),
    [scene.shapes],
  );
  const shapeIds = useMemo(
    () => new Set(scene.shapes.map((shape) => shape.id)),
    [scene.shapes],
  );
  const selectedTextShape = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const shape = scene.shapes.find((item) => item.id === selectedIds[0]);
    return shape?.type === "text" ? shape : null;
  }, [scene.shapes, selectedIds]);

  const registerNode = useCallback((id: string, node: KonvaNode | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

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

  useEffect(
    () => () => {
      if (cameraCommitTimerRef.current) {
        clearTimeout(cameraCommitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void document.fonts
      .load(`16px ${schoolbell.style.fontFamily}`)
      .then(() => {
      if (!cancelled) stageRef.current?.batchDraw();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync transformer to selected nodes (re-runs on selection change).
  useLayoutEffect(() => {
    const tr = transformerRef.current;
    const nodes: KonvaNode[] = [];
    for (const id of selectedIds) {
      // Skip the text shape being edited — its Konva node is unmounted
      // (the DOM textarea overlay handles the visual) so the Transformer
      // can't attach to it.
      if (id === editingTextId) continue;
      const n = nodeRefs.current.get(id);
      if (n) nodes.push(n);
    }
    if (tr) {
      tr.nodes(nodes);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }
  }, [selectedIds, editingTextId, tool, orderedShapes]);

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
    },
    [api, toolDefaults],
  );

  const extendPen = useCallback((wx: number, wy: number) => {
    const live = livePenRef.current;
    if (!live) return;
    live.points.push([wx - live.origin.x, wy - live.origin.y, 0.5]);
    const node = nodeRefs.current.get(live.id);
    if (node instanceof Konva.Path) {
      node.data(getPenPathData(live.points, node.getAttr("penSize") ?? 4));
      node.getLayer()?.batchDraw();
    }
  }, []);

  const endPen = useCallback(() => {
    const live = livePenRef.current;
    if (!live) return;
    api.updateShapeTransient(live.id, { points: live.points.slice() });
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
      liveRectRef.current = {
        id,
        originX: wx,
        originY: wy,
        x: wx,
        y: wy,
        width: 0,
        height: 0,
      };
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
      liveRectRef.current = {
        id,
        originX: wx,
        originY: wy,
        x: wx,
        y: wy,
        width: 0,
        height: 0,
      };
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
      live.x = x;
      live.y = y;
      live.width = w;
      live.height = h;
      const node = nodeRefs.current.get(live.id);
      if (node) {
        node.position({ x, y });
        if (node instanceof Konva.Group) {
          const ellipse = node.findOne<Konva.Ellipse>(".ellipse-body");
          ellipse?.position({ x: w / 2, y: h / 2 });
          ellipse?.radius({ x: w / 2, y: h / 2 });
        } else {
          node.size({ width: w, height: h });
        }
        node.getLayer()?.batchDraw();
      }
    },
    [],
  );

  const endRect = useCallback(() => {
    const live = liveRectRef.current;
    if (!live) return;
    api.updateShapeTransient(live.id, {
      x: live.x,
      y: live.y,
      width: live.width,
      height: live.height,
    });
    liveRectRef.current = null;
    onDrawingEnd?.();
  }, [api, onDrawingEnd]);

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
      setSelectedIds([id], false);
      setMagnetTarget(null);
    },
    [api, toolDefaults, setSelectedIds],
  );

  const extendArrow = useCallback(
    (wx: number, wy: number) => {
      const live = liveArrowRef.current;
      if (!live) return;
      // Magnetic snap: if the pointer is near a shape's bounding box edge,
      // snap the new point to that edge.
      const snap = magnetSnap(wx, wy, scene.shapes, 12 / scene.camera.zoom, live.id);
      const sx = snap ? snap.point.x : wx;
      const sy = snap ? snap.point.y : wy;
      live.points.push([sx - live.origin.x, sy - live.origin.y]);
      const node = nodeRefs.current.get(live.id);
      if (node instanceof Konva.Arrow) {
        node.points(flatArrowPoints(live.points));
        node.getLayer()?.batchDraw();
      }
      setMagnetTarget(snap ? { shapeId: snap.shapeId, point: snap.point } : null);
    },
    [scene.shapes, scene.camera.zoom],
  );

  const endArrow = useCallback(() => {
    const live = liveArrowRef.current;
    if (!live) return;
    api.updateShapeTransient(live.id, { points: live.points.slice() });
    liveArrowRef.current = null;
    setMagnetTarget(null);
    onDrawingEnd?.();
  }, [api, onDrawingEnd]);

  const eraserTolerance = ERASER_TOLERANCE_SCREEN_PX / scene.camera.zoom;

  const beginErase = useCallback(
    (wx: number, wy: number) => {
      isErasingRef.current = true;
      const hit = hitTopShape(wx, wy, eraserTolerance);
      if (hit) api.removeShapes([hit.id]);
    },
    [api, hitTopShape, eraserTolerance],
  );

  const extendErase = useCallback(
    (wx: number, wy: number) => {
      if (!isErasingRef.current) return;
      const hits: Array<string> = [];
      for (const s of orderedShapes) {
        if (hitShapeExpanded(s, wx, wy, eraserTolerance)) hits.push(s.id);
      }
      if (hits.length > 0) api.removeShapes(hits);
    },
    [api, orderedShapes, eraserTolerance],
  );

  const endErase = useCallback(() => {
    isErasingRef.current = false;
  }, []);

  // Pan via stage drag (pan tool).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.draggable(tool === "pan");
  }, [tool]);

  // Stage event handlers --------------------------------------------------
  const onStagePointerDown = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const native = e.evt;
      const isRight = native.button === 2;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      if (isRight) return;
      const wp = getWorldPoint(pointer.x, pointer.y);
      const shapeNode = findShapeNode(e.target, shapeIds);
      const additive = native.shiftKey;

      // Clear any active marquee when switching tools or clicking.
      if (marqueeRef.current && tool !== "select") {
        marqueeRef.current = null;
        setMarquee(null);
      }
      // Clear magnet hint when not actively drawing an arrow.
      if (tool !== "arrow" && magnetTargetRef.current) {
        setMagnetTarget(null);
      }

      if (tool === "select") {
        const curIds = selectedIdsRef.current;
        if (shapeNode) {
          const id = shapeNode.id();
          if (additive) {
            if (curIds.includes(id)) {
              setSelectedIds(curIds.filter((sid) => sid !== id), false);
            } else {
              setSelectedIds([...curIds, id], false);
            }
          } else if (!curIds.includes(id)) {
            setSelectedIds([id], false);
          }
        } else if (
          isTransformerTarget(e.target) &&
          (e.target as unknown) !== transformerRef.current
        ) {
          // Click on transformer anchor (resize handle) — let Konva handle it
          return;
        } else if (isTransformerTarget(e.target) || curIds.length > 0) {
          // Click on transformer border or near selected shapes → group drag
          const pad = 20 / scene.camera.zoom;
          const nearSelected = curIds.some((sid) => {
            const s = scene.shapes.find((sh) => sh.id === sid);
            if (!s) return false;
            const b = shapeBounds(s);
            if (!b) return false;
            return (
              wp.x >= b.x - pad &&
              wp.x <= b.x + b.width + pad &&
              wp.y >= b.y - pad &&
              wp.y <= b.y + b.height + pad
            );
          });
          if (nearSelected || isTransformerTarget(e.target)) {
            dragGroupRef.current = { startWx: wp.x, startWy: wp.y };
            return;
          }
          // Start marquee on empty space.
          marqueeRef.current = {
            startX: wp.x,
            startY: wp.y,
            currentX: wp.x,
            currentY: wp.y,
          };
          setSelectedIds([], false);
        } else {
          // Start marquee on empty space.
          marqueeRef.current = {
            startX: wp.x,
            startY: wp.y,
            currentX: wp.x,
            currentY: wp.y,
          };
          setSelectedIds([], false);
        }
        return;
      }

      if (tool === "text") {
        // Text placement is handled by a DOM layer in CanvasPage so textarea
        // focus does not depend on Konva's pointer event routing.
        return;
      }

      // Other draw tools don't start drawing on top of an existing shape.
      if (shapeNode) return;

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
      if (tool === "eraser") {
        beginErase(wp.x, wp.y);
        return;
      }
      if (tool === "pan") return;
    },
    [
      tool,
      getWorldPoint,
      beginPen,
      beginRect,
      beginEllipse,
      beginArrow,
      beginErase,
      setSelectedIds,
      shapeIds,
    ],
  );

  const onStagePointerMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;


    const wp = getWorldPoint(pointer.x, pointer.y);

    if (marqueeRef.current) {
      marqueeRef.current.currentX = wp.x;
      marqueeRef.current.currentY = wp.y;
      const m = marqueeRef.current;
      setMarquee({
        x: Math.min(m.startX, m.currentX),
        y: Math.min(m.startY, m.currentY),
        width: Math.abs(m.currentX - m.startX),
        height: Math.abs(m.currentY - m.startY),
      });
      return;
    }

    if (dragGroupRef.current) {
      const ids = selectedIdsRef.current;
      const dx = wp.x - dragGroupRef.current.startWx;
      const dy = wp.y - dragGroupRef.current.startWy;
      if (Math.hypot(dx, dy) > 0) {
        dragGroupRef.current.startWx = wp.x;
        dragGroupRef.current.startWy = wp.y;
        for (const id of ids) {
          const node = nodeRefs.current.get(id);
          if (node) {
            node.x(node.x() + dx);
            node.y(node.y() + dy);
            node.getLayer()?.batchDraw();
          }
        }
      }
      return;
    }

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
  }, [
    getWorldPoint,
    extendPen,
    extendRect,
    extendArrow,
    extendErase,
    tool,
    containerRef,
  ]);

  const onStagePointerUp = useCallback(
    (e?: KonvaEventObject<PointerEvent>) => {
      if (dragGroupRef.current) {
        dragGroupRef.current = null;
        const ids = selectedIdsRef.current;
        for (const id of ids) {
          const node = nodeRefs.current.get(id);
          if (node) {
            updateShape(id, { x: node.x(), y: node.y() });
          }
        }
        return;
      }
      if (marqueeRef.current) {
        const m = marqueeRef.current;
        marqueeRef.current = null;
        const x1 = Math.min(m.startX, m.currentX);
        const y1 = Math.min(m.startY, m.currentY);
        const x2 = Math.max(m.startX, m.currentX);
        const y2 = Math.max(m.startY, m.currentY);
        setMarquee(null);
        // If the marquee is essentially a click (no drag), clear selection.
        if (x2 - x1 < 2 && y2 - y1 < 2) {
          setSelectedIds([], false);
          return;
        }
        const hit: Array<string> = [];
        for (const s of orderedShapes) {
          if (s.type === "pen") {
            const inRect = s.points.some((p) => {
              const px = s.x + p[0];
              const py = s.y + p[1];
              return px >= x1 && px <= x2 && py >= y1 && py <= y2;
            });
            if (inRect) hit.push(s.id);
          } else {
            const b = shapeBounds(s);
            if (!b) continue;
            if (
              b.x < x2 &&
              b.x + b.width > x1 &&
              b.y < y2 &&
              b.y + b.height > y1
            ) {
              hit.push(s.id);
            }
          }
        }
        setSelectedIds(hit, false);
        return;
      }
      if (livePenRef.current) endPen();
      if (liveRectRef.current) endRect();
      if (liveArrowRef.current) endArrow();
      if (isErasingRef.current) endErase();
    },
    [
      endPen,
      endRect,
      endArrow,
      endErase,
      orderedShapes,
      setSelectedIds,
      setCamera,
      tool,
      onContextMenuEvent,
    ],
  );

  const onStageDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setCamera({ x: stage.x(), y: stage.y() });
    stage.container().style.cursor = cursorForTool(tool);
  }, [setCamera, tool]);

  const onStageDragStart = useCallback(() => {
    const stage = stageRef.current;
    if (stage && tool === "pan") stage.container().style.cursor = "grabbing";
  }, [tool]);

  const onShapeDragEnd = useCallback(
    (id: string, e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateShape(id, { x: node.x(), y: node.y() });
    },
    [updateShape],
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
      let nextCamera = {
        x: stage.x(),
        y: stage.y(),
        zoom: oldZoom,
      };
      if (isZoom) {
        const direction = e.evt.deltaY < 0 ? 1 : -1;
        const factor = 1 + direction * 0.08;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
        nextCamera = {
          zoom: newZoom,
          x: pointer.x - worldUnderPointer.x * newZoom,
          y: pointer.y - worldUnderPointer.y * newZoom,
        };
      } else {
        nextCamera = {
          zoom: oldZoom,
          x: stage.x() - e.evt.deltaX,
          y: stage.y() - e.evt.deltaY,
        };
      }
      stage.position({ x: nextCamera.x, y: nextCamera.y });
      stage.scale({ x: nextCamera.zoom, y: nextCamera.zoom });
      stage.batchDraw();

      const container = containerRef.current;
      if (container) {
        container.style.backgroundSize =
          `${GRID_SIZE * nextCamera.zoom}px ${GRID_SIZE * nextCamera.zoom}px`;
        container.style.backgroundPosition =
          `${nextCamera.x}px ${nextCamera.y}px`;
      }

      if (cameraCommitTimerRef.current) {
        clearTimeout(cameraCommitTimerRef.current);
      }
      cameraCommitTimerRef.current = setTimeout(() => {
        setCamera(nextCamera);
        cameraCommitTimerRef.current = null;
      }, 120);
    },
    [setCamera, containerRef],
  );

  // Right-click: pan on drag, context menu on plain click — handled via native
  // DOM events so pointer capture works correctly (Konva events don't fire
  // outside the canvas element when pointer is captured).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const el = stage.container();

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      e.preventDefault();

      const stageNode = stageRef.current;
      if (!stageNode) return;
      const canvasEl = el.querySelector("canvas");
      const rect = canvasEl ? canvasEl.getBoundingClientRect() : el.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      // Find shape under cursor for context menu.
      const pointer = stageNode.getPointerPosition() ?? { x: startX, y: startY };
      const target = stageNode.getIntersection(pointer);
      const shapeNode = findShapeNode(target, shapeIds);
      const id = shapeNode?.id();
      const ids: string[] = id
        ? (selectedIds as string[]).includes(id)
          ? (selectedIds as string[])
          : [id]
        : [];

      const startCamera = { x: stageNode.x(), y: stageNode.y() };
      const worldPoint = getWorldPoint(pointer.x, pointer.y);
      let active = false;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - e.clientX;
        const dy = me.clientY - e.clientY;
        if (!active && Math.hypot(dx, dy) < 6) return;
        if (!active) {
          active = true;
          el.style.cursor = "grabbing";
        }
        const nx = startCamera.x + dx;
        const ny = startCamera.y + dy;
        stageNode.position({ x: nx, y: ny });
        stageNode.batchDraw();
        const container = containerRef.current;
        if (container) container.style.backgroundPosition = `${nx}px ${ny}px`;
      };

      const onUp = (ue: MouseEvent) => {
        if (ue.button !== 2) return;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        el.style.cursor = cursorForTool(tool);
        if (active) {
          setCamera({ x: stageNode.x(), y: stageNode.y() });
        } else {
          if (ids.length > 0) setSelectedIds(ids, false);
          onContextMenuEvent(
            { sx: ue.clientX, sy: ue.clientY, wx: worldPoint.x, wy: worldPoint.y },
            ids,
          );
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    el.addEventListener("contextmenu", onContextMenu);
    el.addEventListener("mousedown", onMouseDown);
    return () => {
      el.removeEventListener("contextmenu", onContextMenu);
      el.removeEventListener("mousedown", onMouseDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, selectedIds, shapeIds, tool, getWorldPoint, setCamera, setSelectedIds, onContextMenuEvent, containerRef]);


  const onShapeDblClick = useCallback(
    (shape: Shape, e: KonvaEventObject<MouseEvent>) => {
      if (shape.type !== "text") return;
      e.cancelBubble = true;
      onRequestTextEdit(shape);
    },
    [onRequestTextEdit],
  );

  const handleShapeHover = useCallback(
    (hovering: boolean) => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.container().style.cursor =
        tool === "select" && hovering ? "move" : cursorForTool(tool);
    },
    [tool],
  );

  const isDark = useSyncExternalStore(
    (cb) => { const obs = new MutationObserver(cb); obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); return () => obs.disconnect(); },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  const isDrawing = tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "arrow" || tool === "eraser";
  const stageStyle = useMemo<React.CSSProperties>(
    () => isDark ? ({
      backgroundColor: "#1a1a1a",
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
      backgroundSize: `${GRID_SIZE * scene.camera.zoom}px ${GRID_SIZE * scene.camera.zoom}px`,
      backgroundPosition: `${scene.camera.x}px ${scene.camera.y}px`,
      cursor: cursorForTool(tool),
    }) : ({
      backgroundColor: "#fff8f1",
      backgroundImage:
        "linear-gradient(to right, rgba(30, 27, 21, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 27, 21, 0.08) 1px, transparent 1px)",
      backgroundSize: `${GRID_SIZE * scene.camera.zoom}px ${GRID_SIZE * scene.camera.zoom}px`,
      backgroundPosition: `${scene.camera.x}px ${scene.camera.y}px`,
      cursor: cursorForTool(tool),
    }),
    [
      isDark,
      scene.camera.zoom,
      scene.camera.x,
      scene.camera.y,
      tool,
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
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onDragStart={onStageDragStart}
        onDragEnd={onStageDragEnd}
        onWheel={onWheel}
      >
        <Layer>
          {orderedShapes.map((shape) => (
              <ShapeNode
                key={shape.id}
                shape={shape}
                isDark={isDark}
                isDraggable={tool === "select" && !isDrawing}
                isHidden={shape.id === editingTextId}
                registerNode={registerNode}
                onDragEnd={onShapeDragEnd}
                onDblClick={onShapeDblClick}
                onHover={handleShapeHover}
                tool={tool}
                selectedIds={selectedIds}
              />
          ))}
          {marquee && (
            <Rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
              fill="rgba(30, 27, 21, 0.04)"
              stroke="#1e1b15"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}
          {magnetTarget && (
            <Circle
              x={magnetTarget.point.x}
              y={magnetTarget.point.y}
              radius={6 / scene.camera.zoom}
              stroke="#1e1b15"
              strokeWidth={1.5 / scene.camera.zoom}
              fill="rgba(201, 243, 8, 0.6)"
              listening={false}
            />
          )}
          {selectedIds.length > 0 && tool === "select" && (
            <CanvasTransformer
              ref={transformerRef}
              enabledAnchors={
                selectedTextShape
                  ? TEXT_TRANSFORMER_ANCHORS
                  : TRANSFORMER_ANCHORS
              }
              keepRatio={Boolean(selectedTextShape)}
              minWidth={selectedTextShape ? 40 : 5}
              minHeight={selectedTextShape ? 8 : 5}
              onTransformStart={() => {
                transformAnchorRef.current =
                  transformerRef.current?.getActiveAnchor() ?? null;
              }}
              onTransform={() => {
                // Konva owns the live transform. React state is committed once
                // on transform end, avoiding a render for every pointer move.
                const tr = transformerRef.current;
                if (!tr) return;
                const anchor =
                  tr.getActiveAnchor() ?? transformAnchorRef.current;
                if (
                  selectedTextShape &&
                  (anchor === "middle-left" || anchor === "middle-right")
                ) {
                  const node = tr.nodes()[0];
                  if (node instanceof Konva.Text) {
                    node.width(Math.max(40, node.width() * Math.abs(node.scaleX())));
                    node.scaleX(1);
                    node.scaleY(1);
                    tr.forceUpdate();
                  }
                }
                tr.getLayer()?.batchDraw();
              }}
              onTransformEnd={() => {
                const tr = transformerRef.current;
                if (!tr) return;
                const updates: Array<{ id: string; patch: Partial<Shape> }> = [];
                tr.getNodes().forEach((node) => {
                  const id = node.id();
                  if (!id) return;
                  const shape = api.scene.shapes.find((s) => s.id === id);
                  if (!shape) return;
                  const scaleX = Math.abs(node.scaleX());
                  const scaleY = Math.abs(node.scaleY());
                  const rotation = node.rotation();
                  const x = node.x();
                  const y = node.y();
                  if (shape.type === "rect" || shape.type === "ellipse") {
                    const newWidth = Math.max(1, shape.width * scaleX);
                    const newHeight = Math.max(1, shape.height * scaleY);
                    updates.push({
                      id,
                      patch: { x, y, rotation, width: newWidth, height: newHeight },
                    });
                  } else if (shape.type === "arrow") {
                    const newPoints = shape.points.map(
                      (p) => [p[0] * scaleX, p[1] * scaleY] as const,
                    );
                    updates.push({
                      id,
                      patch: { x, y, rotation, points: newPoints },
                    });
                  } else if (shape.type === "pen") {
                    const newPoints = shape.points.map(
                      (p) =>
                        [p[0] * scaleX, p[1] * scaleY, p[2]] as readonly [
                          number,
                          number,
                          number,
                        ],
                    );
                    updates.push({
                      id,
                      patch: { x, y, rotation, points: newPoints },
                    });
                  } else {
                    const textWidth = shape.width ?? node.width();
                    const anchor = transformAnchorRef.current;
                    const isWidthResize =
                      anchor === "middle-left" || anchor === "middle-right";
                    const uniformScale = Math.max(scaleX, scaleY);
                    updates.push({
                      id,
                      patch: {
                        x,
                        y,
                        rotation,
                        width: Math.max(
                          40,
                          isWidthResize
                            ? node.width()
                            : textWidth * uniformScale,
                        ),
                        fontSize: isWidthResize
                          ? shape.fontSize
                          : Math.max(8, shape.fontSize * uniformScale),
                      },
                    });
                  }
                });
                transformAnchorRef.current = null;
                if (updates.length > 0) api.updateMany(updates);
                tr.forceUpdate();
                tr.getLayer()?.batchDraw();
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

// Map "default" light-mode colors to dark equivalents at render time
// so shapes are visible without mutating stored data.
function adaptColor(color: string, isDark: boolean): string {
  if (!isDark) return color;
  if (color === "#1e1b15" || color === "#000000" || color === "#000") return "#f0ede8";
  if (color === "#fff8f1" || color === "#ffffff" || color === "#fff") return "#1a1a1a";
  return color;
}

const ShapeNode = React.memo(function ShapeNode({
  shape,
  isDark,
  isDraggable,
  isHidden,
  registerNode,
  onDragEnd,
  onDblClick,
  onHover,
  tool,
  selectedIds,
}: {
  shape: Shape;
  isDark: boolean;
  isDraggable: boolean;
  isHidden: boolean;
  registerNode: (id: string, n: KonvaNode | null) => void;
  onDragEnd: (id: string, e: KonvaEventObject<DragEvent>) => void;
  onDblClick: (shape: Shape, e: KonvaEventObject<MouseEvent>) => void;
  onHover: (hovering: boolean) => void;
  tool: Tool;
  selectedIds: ReadonlyArray<string>;
}) {
  // Reset Konva scale to 1 after the store update propagates. This is
  // necessary because the Transformer applies scale to the node during
  // resize; we bake the scale into the shape's intrinsic dimensions (or
  // point arrays) and then clear the Konva scale so the next paint matches.
  const nodeRef = useRef<KonvaNode | null>(null);
  useLayoutEffect(() => {
    const n = nodeRef.current;
    if (!n) return;
    if (n.scaleX() !== 1 || n.scaleY() !== 1) {
      n.scaleX(1);
      n.scaleY(1);
      n.getLayer()?.batchDraw();
    }
  });

  // Combined ref: stores the node locally for the scale-reset effect AND
  // calls the parent-supplied registerNode so the Transformer can find it.
  const setRef = useCallback(
    (n: KonvaNode | null) => {
      nodeRef.current = n;
      registerNode(shape.id, n);
    },
    [registerNode, shape.id],
  );

  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    draggable: isDraggable,
    strokeScaleEnabled: false,
    onDragEnd: (e: KonvaEventObject<DragEvent>) => onDragEnd(shape.id, e),
    onDblClick: (e: KonvaEventObject<MouseEvent>) => onDblClick(shape, e),
    onPointerEnter: () => onHover(true),
    onPointerLeave: () => onHover(false),
  };

  // Adapt colors for dark mode without mutating stored shape data
  const stroke = adaptColor(shape.stroke, isDark);
  const fill = adaptColor(shape.fill, isDark);
  const strokeWidth = shape.strokeWidth;

  const penData = useMemo(
    () =>
      shape.type === "pen"
        ? getPenPathData(shape.points, shape.size)
        : "",
    [shape],
  );
  const patternImage = useMemo(
    () =>
      shape.type === "rect" || shape.type === "ellipse"
        ? getFillPatternImage(shape.fillPattern, fill, stroke)
        : undefined,
    [shape, fill, stroke],
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

  if (isHidden) return null;

  if (shape.type === "rect") {
    return (
      <Rect
        {...commonProps}
        ref={setRef as unknown as (n: Konva.Rect | null) => void}
        width={shape.width}
        height={shape.height}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={patternImage ? undefined : fill}
        fillPatternImage={patternImage}
        fillPatternRepeat="repeat"
        fillPriority={patternImage ? "pattern" : "color"}
        listening
      />
    );
  }
  if (shape.type === "ellipse" && ellipseOffsets) {
    return (
      <Group
        {...commonProps}
        ref={setRef as unknown as (n: Konva.Group | null) => void}
        listening
      >
        <Ellipse
          name="ellipse-body"
          x={ellipseOffsets.cx}
          y={ellipseOffsets.cy}
          radiusX={ellipseOffsets.rx}
          radiusY={ellipseOffsets.ry}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={patternImage ? undefined : fill}
          fillPatternImage={patternImage}
          fillPatternRepeat="repeat"
          fillPriority={patternImage ? "pattern" : "color"}
          listening
        />
      </Group>
    );
  }
  if (shape.type === "arrow") {
    return (
      <Arrow
        {...commonProps}
        ref={setRef as unknown as (n: Konva.Arrow | null) => void}
        points={flatArrowPoints(shape.points)}
        stroke={stroke}
        fill={stroke}
        strokeWidth={strokeWidth}
        pointerLength={arrowHeadLength(strokeWidth)}
        pointerWidth={arrowHeadWidth(strokeWidth)}
        lineCap="round"
        lineJoin="round"
        tension={0.18}
        listening
      />
    );
  }
  if (shape.type === "pen") {
    if (!penData) {
      return (
        <Path
          {...commonProps}
          ref={setRef as unknown as (n: Konva.Path | null) => void}
          penSize={shape.size}
          data={circlePath(Math.max(1, shape.size / 2))}
          fill={stroke}
        />
      );
    }
    return (
      <Path
        {...commonProps}
        ref={setRef as unknown as (n: Konva.Path | null) => void}
        penSize={shape.size}
        data={penData}
        fill={stroke}
        listening
      />
    );
  }
  if (shape.type === "text") {
    return (
      <KonvaText
        {...commonProps}
        ref={setRef as unknown as (n: Konva.Text | null) => void}
        text={shape.text || " "}
        fontSize={shape.fontSize}
        fontFamily={schoolbell.style.fontFamily}
        fontStyle="normal"
        fill={stroke}
        lineHeight={1.2}
        width={shape.width}
        align={shape.align ?? "left"}
        listening
      />
    );
  }
  return null;
});

const CanvasTransformer = React.memo(
  React.forwardRef<
    Konva.Transformer,
    {
      enabledAnchors: string[];
      keepRatio: boolean;
      minWidth: number;
      minHeight: number;
      onTransformStart: () => void;
      onTransform: () => void;
      onTransformEnd: () => void;
    }
  >(
    function CanvasTransformer(
      {
        enabledAnchors,
        keepRatio,
        minWidth,
        minHeight,
        onTransformStart,
        onTransform,
        onTransformEnd,
      },
      ref,
    ) {
      return (
        <Transformer
          ref={ref}
          {...TRANSFORMER_PROPS}
          enabledAnchors={enabledAnchors}
          keepRatio={keepRatio}
          boundBoxFunc={(oldBox, newBox) =>
            Math.abs(newBox.width) < minWidth ||
            Math.abs(newBox.height) < minHeight
              ? oldBox
              : newBox
          }
          onTransformStart={onTransformStart}
          onTransform={onTransform}
          onTransformEnd={onTransformEnd}
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
  return points.flatMap(([x, y]) => [x, y]);
}

function arrowHeadLength(strokeWidth: number): number {
  return Math.max(12, strokeWidth * 4);
}

function arrowHeadWidth(strokeWidth: number): number {
  return Math.max(10, strokeWidth * 3.25);
}

function findShapeNode(
  target: KonvaNode | null | undefined,
  shapeIds: ReadonlySet<string>,
): KonvaNode | null {
  let n: KonvaNode | null = target ?? null;
  while (n) {
    if (shapeIds.has(n.id())) return n;
    n = n.getParent();
  }
  return null;
}

function isTransformerTarget(target: KonvaNode | null | undefined): boolean {
  let node: KonvaNode | null = target ?? null;
  while (node) {
    if (node instanceof Konva.Transformer) return true;
    node = node.getParent();
  }
  return false;
}

type Bounds = { x: number; y: number; width: number; height: number };

function shapeBounds(shape: Shape): Bounds | null {
  if (shape.type === "rect") {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    };
  }
  if (shape.type === "ellipse") {
    return {
      x: shape.x,
      y: shape.y,
      width: Math.abs(shape.width),
      height: Math.abs(shape.height),
    };
  }
  if (shape.type === "text") {
    const h = shape.fontSize * 1.2;
    return {
      x: shape.x,
      y: shape.y - shape.fontSize,
      width: shape.width ?? 200,
      height: h,
    };
  }
  if (shape.type === "arrow") {
    if (shape.points.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of shape.points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const pad = arrowHeadLength(shape.strokeWidth) + shape.strokeWidth;
    return {
      x: shape.x + minX - pad,
      y: shape.y + minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }
  if (shape.type === "pen") {
    if (shape.points.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of shape.points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const pad = shape.size / 2;
    return {
      x: shape.x + minX - pad,
      y: shape.y + minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }
  return null;
}

function magnetSnap(
  wx: number,
  wy: number,
  shapes: ReadonlyArray<Shape>,
  threshold: number,
  excludeId?: string,
): { shapeId: string; point: { x: number; y: number } } | null {
  let best: { shapeId: string; x: number; y: number; dist: number } | null = null;
  for (const shape of shapes) {
    if (shape.id === excludeId) continue;
    const b = shapeBounds(shape);
    if (!b) continue;
    // Clamp the pointer to the bounding box — the nearest point on the box
    // edge to the pointer. If the pointer is inside the box, this returns
    // the pointer itself, which is the "snap to interior" case.
    const cx = Math.max(b.x, Math.min(wx, b.x + b.width));
    const cy = Math.max(b.y, Math.min(wy, b.y + b.height));
    const dx = wx - cx;
    const dy = wy - cy;
    const dist = Math.hypot(dx, dy);
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { shapeId: shape.id, x: cx, y: cy, dist };
    }
  }
  return best ? { shapeId: best.shapeId, point: { x: best.x, y: best.y } } : null;
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
  const head = arrowHeadLength(shape.strokeWidth);
  const dx = last[0] - prev[0];
  const dy = last[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const baseX = last[0] - ux * head;
  const baseY = last[1] - uy * head;
  const px = -uy;
  const py = ux;
  const halfWidth = arrowHeadWidth(shape.strokeWidth) / 2;
  const a1x = baseX + px * halfWidth;
  const a1y = baseY + py * halfWidth;
  const a2x = baseX - px * halfWidth;
  const a2y = baseY - py * halfWidth;
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

function cursorForTool(tool: Tool): string {
  switch (tool) {
    case "pan":
      return "grab";
    case "pen":
    case "rect":
    case "ellipse":
    case "arrow":
      return "crosshair";
    case "text":
      return "text";
    case "eraser":
      return "cell";
    case "select":
    default:
      return "default";
  }
}
