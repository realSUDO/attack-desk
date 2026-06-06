import type {
  Shape,
  PenShape,
  RectShape,
  EllipseShape,
  TextShape,
  ArrowShape,
} from "./types";

export type Vec2 = readonly [number, number];

export function distance(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number,
): [number, number] {
  if (angleDeg === 0) return [px, py];
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

export function inverseRotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number,
): [number, number] {
  return rotatePoint(px, py, cx, cy, -angleDeg);
}

export function rotateBounds(
  b: { x: number; y: number; w: number; h: number },
  cx: number,
  cy: number,
  angleDeg: number,
): { x: number; y: number; w: number; h: number } {
  if (angleDeg === 0) return b;
  const corners: Array<[number, number]> = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of corners) {
    const [rx, ry] = rotatePoint(x, y, cx, cy, angleDeg);
    if (rx < minX) minX = rx;
    if (ry < minY) minY = ry;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function shapeOrigin(shape: Shape): [number, number] {
  return [shape.x, shape.y];
}

/**
 * Resample a polyline so that consecutive points are spaced ~`step` apart
 * along the arc length. Steve Ruiz's technique (used by tldraw / Excalidraw).
 */
export function resamplePolyline(
  points: ReadonlyArray<Vec2>,
  step: number,
): Array<Vec2> {
  if (points.length === 0) return [];
  if (points.length === 1) return [[points[0]![0], points[0]![1]] as Vec2];
  if (step <= 0) return points.map((p) => [p[0], p[1]] as Vec2);

  const result: Array<Vec2> = [[points[0]![0], points[0]![1]] as Vec2];
  let prev = points[0]!;
  let remaining = step;

  for (let i = 1; i < points.length; i += 1) {
    const cur = points[i]!;
    let segLen = distance(prev, cur);
    if (segLen === 0) continue;

    while (segLen >= remaining) {
      const t = remaining / segLen;
      const nx = prev[0] + (cur[0] - prev[0]) * t;
      const ny = prev[1] + (cur[1] - prev[1]) * t;
      const next: Vec2 = [nx, ny];
      result.push(next);
      prev = next;
      segLen = distance(prev, cur);
      remaining = step;
    }

    remaining -= segLen;
    prev = cur;
  }

  const tail = points[points.length - 1]!;
  const last = result[result.length - 1]!;
  if (distance(last, tail) > step * 0.5) {
    result.push([tail[0], tail[1]] as Vec2);
  }
  return result;
}

/**
 * Ramer–Douglas–Peucker simplification. Compresses long pen strokes and
 * removes micro-jitter from rapid pointer events.
 */
export function simplifyRDP(
  points: ReadonlyArray<Vec2>,
  tolerance: number,
): Array<Vec2> {
  if (points.length <= 2) {
    return points.map((p) => [p[0], p[1]] as Vec2);
  }

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    if (end - start < 2) continue;

    const a = points[start]!;
    const b = points[end]!;
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    const dx = bx - ax;
    const dy = by - ay;
    const segLen = Math.hypot(dx, dy);

    let maxDist = 0;
    let maxIndex = -1;
    const tol2 = tolerance * tolerance;

    for (let i = start + 1; i < end; i += 1) {
      const p = points[i]!;
      const px = p[0];
      const py = p[1];
      let d2: number;
      if (segLen === 0) {
        d2 = (px - ax) * (px - ax) + (py - ay) * (py - ay);
      } else {
        const t = ((px - ax) * dx + (py - ay) * dy) / (segLen * segLen);
        const tt = t < 0 ? 0 : t > 1 ? 1 : t;
        const projX = ax + tt * dx;
        const projY = ay + tt * dy;
        d2 = (px - projX) * (px - projX) + (py - projY) * (py - projY);
      }
      if (d2 > maxDist) {
        maxDist = d2;
        maxIndex = i;
      }
    }

    if (maxIndex !== -1 && maxDist > tol2) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex]);
      stack.push([maxIndex, end]);
    }
  }

  const out: Array<Vec2> = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) out.push([points[i]![0], points[i]![1]] as Vec2);
  }
  return out;
}

export function penPath(points: ReadonlyArray<Vec2>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p[0]} ${p[1]}`;
  }
  if (points.length === 2) {
    const p0 = points[0]!;
    const p1 = points[1]!;
    return `M ${p0[0]} ${p0[1]} L ${p1[0]} ${p1[1]}`;
  }

  const segments: string[] = [];
  const p0 = points[0]!;
  segments.push(`M ${p0[0]} ${p0[1]}`);

  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const pPrev = points[i - 1] ?? p1;
    const pNext = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - pPrev[0]) / 6;
    const cp1y = p1[1] + (p2[1] - pPrev[1]) / 6;
    const cp2x = p2[0] - (pNext[0] - p1[0]) / 6;
    const cp2y = p2[1] - (pNext[1] - p1[1]) / 6;
    segments.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`);
  }

  return segments.join(" ");
}

export function rectBounds(shape: RectShape): { x: number; y: number; w: number; h: number } {
  return {
    x: shape.width >= 0 ? shape.x : shape.x + shape.width,
    y: shape.height >= 0 ? shape.y : shape.y + shape.height,
    w: Math.abs(shape.width),
    h: Math.abs(shape.height),
  };
}

export function ellipseBounds(shape: EllipseShape): { x: number; y: number; w: number; h: number } {
  return rectBounds({ ...shape, type: "rect" });
}

export function textBounds(shape: TextShape): { x: number; y: number; w: number; h: number } {
  const charWidth = shape.fontSize * 0.6;
  const width = shape.width ?? shape.text.length * charWidth;
  const lines = shape.text.split("\n");
  const h = Math.max(lines.length, 1) * shape.fontSize * 1.2;
  return { x: shape.x, y: shape.y, w: Math.max(width, charWidth), h };
}

export function penBounds(shape: PenShape): { x: number; y: number; w: number; h: number } {
  if (shape.points.length === 0) return { x: shape.x, y: shape.y, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of shape.points) {
    const x = shape.x + px;
    const y = shape.y + py;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function arrowBounds(shape: ArrowShape): { x: number; y: number; w: number; h: number } {
  if (shape.points.length === 0) return { x: shape.x, y: shape.y, w: 0, h: 0 };
  const outline = arrowOutline(shape);
  if (outline.length === 0) return { x: shape.x, y: shape.y, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of outline) {
    const x = shape.x + px;
    const y = shape.y + py;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function shapeBounds(shape: Shape): { x: number; y: number; w: number; h: number } {
  let b: { x: number; y: number; w: number; h: number };
  switch (shape.type) {
    case "pen":
      b = penBounds(shape);
      break;
    case "rect":
      b = rectBounds(shape);
      break;
    case "ellipse":
      b = ellipseBounds(shape);
      break;
    case "text":
      b = textBounds(shape);
      break;
    case "arrow":
      b = arrowBounds(shape);
      break;
  }
  if (shape.rotation === 0) return b;
  const [cx, cy] = shapeOrigin(shape);
  return rotateBounds(b, cx, cy, shape.rotation);
}

export function pointInRect(
  px: number,
  py: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function pointInEllipse(
  px: number,
  py: number,
  e: { x: number; y: number; w: number; h: number },
): boolean {
  if (e.w === 0 || e.h === 0) return false;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const dx = (px - cx) / (e.w / 2);
  const dy = (py - cy) / (e.h / 2);
  return dx * dx + dy * dy <= 1;
}

export function pointInRotatedEllipse(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg: number,
): boolean {
  if (rx === 0 || ry === 0) return false;
  const [lx, ly] = inverseRotatePoint(px, py, cx, cy, rotationDeg);
  const dx = (lx - cx) / rx;
  const dy = (ly - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance([px, py], [x1, y1]);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return distance([px, py], [x1 + t * dx, y1 + t * dy]);
}

export function distanceToPolygon(
  px: number,
  py: number,
  poly: ReadonlyArray<readonly [number, number]>,
): number {
  if (poly.length === 0) return Infinity;
  if (pointInPolygon(px, py, poly)) return 0;
  let min = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const d = distanceToSegment(px, py, a[0], a[1], b[0], b[1]);
    if (d < min) min = d;
  }
  return min;
}

export function pointInPolygon(
  px: number,
  py: number,
  poly: ReadonlyArray<readonly [number, number]>,
): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i]![0];
    const yi = poly[i]![1];
    const xj = poly[j]![0];
    const yj = poly[j]![1];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Compute the visual outline of an arrow shape (line + head triangle)
 * as a closed polygon in local coordinates. Used for hit-testing and
 * eraser so the entire visible arrow is clickable, including the head.
 */
export function arrowOutline(shape: ArrowShape): Array<readonly [number, number]> {
  if (shape.points.length < 2) return [];
  const start = shape.points[0]!;
  const end = shape.points[shape.points.length - 1]!;
  const sx = start[0];
  const sy = start[1];
  const ex = end[0];
  const ey = end[1];
  const angle = Math.atan2(ey - sy, ex - sx);
  if (angle === 0 && ex === sx && ey === sy) return [];
  const headLen = Math.max(10, shape.strokeWidth * 4);
  const headAngle = Math.PI / 6;
  const a1x = ex - headLen * Math.cos(angle - headAngle);
  const a1y = ey - headLen * Math.sin(angle - headAngle);
  const a2x = ex - headLen * Math.cos(angle + headAngle);
  const a2y = ey - headLen * Math.sin(angle + headAngle);
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [[ex, ey], [a1x, a1y], [a2x, a2y]];
  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;
  const halfW = shape.strokeWidth / 2;
  const b1x = sx + perpX * halfW;
  const b1y = sy + perpY * halfW;
  const b2x = sx - perpX * halfW;
  const b2y = sy - perpY * halfW;
  return [[b1x, b1y], [a1x, a1y], [ex, ey], [a2x, a2y], [b2x, b2y]];
}

export function arrowPath(shape: ArrowShape): { line: string; head: string } {
  if (shape.points.length < 2) return { line: "", head: "" };
  const start = shape.points[0]!;
  const end = shape.points[shape.points.length - 1]!;
  const sx = start[0];
  const sy = start[1];
  const ex = end[0];
  const ey = end[1];
  const angle = Math.atan2(ey - sy, ex - sx);
  const headLen = Math.max(10, shape.strokeWidth * 4);
  const headAngle = Math.PI / 6;
  const a1x = ex - headLen * Math.cos(angle - headAngle);
  const a1y = ey - headLen * Math.sin(angle - headAngle);
  const a2x = ex - headLen * Math.cos(angle + headAngle);
  const a2y = ey - headLen * Math.sin(angle + headAngle);
  return {
    line: `M ${sx} ${sy} L ${ex} ${ey}`,
    head: `M ${a1x} ${a1y} L ${ex} ${ey} L ${a2x} ${a2y}`,
  };
}

export function hitTestShape(
  shape: Shape,
  x: number,
  y: number,
  tolerance: number,
): boolean {
  const [cx, cy] = shapeOrigin(shape);
  if (shape.rotation !== 0) {
    [x, y] = inverseRotatePoint(x, y, cx, cy, shape.rotation);
  }
  switch (shape.type) {
    case "rect": {
      const b = rectBounds(shape);
      return pointInRect(x, y, {
        x: b.x - tolerance,
        y: b.y - tolerance,
        w: b.w + 2 * tolerance,
        h: b.h + 2 * tolerance,
      });
    }
    case "ellipse": {
      const b = ellipseBounds(shape);
      const rx = Math.abs(b.w / 2) + tolerance;
      const ry = Math.abs(b.h / 2) + tolerance;
      return pointInRotatedEllipse(x, y, b.x + b.w / 2, b.y + b.h / 2, rx, ry, 0);
    }
    case "text": {
      const b = textBounds(shape);
      return pointInRect(x, y, {
        x: b.x - tolerance,
        y: b.y - tolerance,
        w: b.w + 2 * tolerance,
        h: b.h + 2 * tolerance,
      });
    }
    case "pen": {
      for (let i = 0; i < shape.points.length - 1; i += 1) {
        const a = shape.points[i]!;
        const b = shape.points[i + 1]!;
        const d = distanceToSegment(
          x,
          y,
          shape.x + a[0],
          shape.y + a[1],
          shape.x + b[0],
          shape.y + b[1],
        );
        if (d <= tolerance + shape.size / 2) return true;
      }
      return false;
    }
    case "arrow": {
      const outline = arrowOutline(shape);
      const world: Array<readonly [number, number]> = outline.map(
        ([px, py]) => [shape.x + px, shape.y + py] as const,
      );
      const d = distanceToPolygon(x, y, world);
      return d <= tolerance;
    }
  }
}

export function hitTestShapeSegment(
  shape: Shape,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  margin: number,
): boolean {
  switch (shape.type) {
    case "rect": {
      const b = rectBounds(shape);
      const expanded = {
        x: b.x - margin,
        y: b.y - margin,
        w: b.w + 2 * margin,
        h: b.h + 2 * margin,
      };
      return segmentIntersectsRect(ax, ay, bx, by, expanded);
    }
    case "ellipse": {
      return segmentIntersectsEllipse(
        ax,
        ay,
        bx,
        by,
        shape.x,
        shape.y,
        shape.width,
        shape.height,
        margin,
      );
    }
    case "text": {
      const b = textBounds(shape);
      const expanded = {
        x: b.x - margin,
        y: b.y - margin,
        w: b.w + 2 * margin,
        h: b.h + 2 * margin,
      };
      return segmentIntersectsRect(ax, ay, bx, by, expanded);
    }
    case "pen": {
      for (let i = 0; i < shape.points.length - 1; i += 1) {
        const a = shape.points[i]!;
        const b = shape.points[i + 1]!;
        const sx = shape.x + a[0];
        const sy = shape.y + a[1];
        const ex = shape.x + b[0];
        const ey = shape.y + b[1];
        if (
          segmentToSegmentDistance(ax, ay, bx, by, sx, sy, ex, ey) <=
          margin + shape.size / 2
        ) {
          return true;
        }
      }
      return false;
    }
    case "arrow": {
      const outline = arrowOutline(shape);
      const world: Array<readonly [number, number]> = outline.map(
        ([px, py]) => [shape.x + px, shape.y + py] as const,
      );
      for (let i = 0; i < world.length; i += 1) {
        const a = world[i]!;
        const b = world[(i + 1) % world.length]!;
        if (
          segmentToSegmentDistance(ax, ay, bx, by, a[0], a[1], b[0], b[1]) <=
          margin
        ) {
          return true;
        }
      }
      return false;
    }
  }
}

function segmentIntersectsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  if (
    Math.max(ax, bx) < r.x - 1 ||
    Math.min(ax, bx) > r.x + r.w + 1 ||
    Math.max(ay, by) < r.y - 1 ||
    Math.min(ay, by) > r.y + r.h + 1
  ) {
    return false;
  }
  if (pointInRect(ax, ay, r) || pointInRect(bx, by, r)) return true;
  const edges: Array<[number, number, number, number]> = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsIntersect(ax, ay, bx, by, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

function segmentIntersectsEllipse(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ex: number,
  ey: number,
  ew: number,
  eh: number,
  margin: number,
): boolean {
  if (ew === 0 || eh === 0) return false;
  const cx = ex + ew / 2;
  const cy = ey + eh / 2;
  const rx = Math.abs(ew / 2) + margin;
  const ry = Math.abs(eh / 2) + margin;
  if (pointInEllipseRaw(ax, ay, cx, cy, rx, ry)) return true;
  if (pointInEllipseRaw(bx, by, cx, cy, rx, ry)) return true;
  const steps = 8;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const sx = ax + (bx - ax) * t;
    const sy = ay + (by - ay) * t;
    if (pointInEllipseRaw(sx, sy, cx, cy, rx, ry)) return true;
  }
  return false;
}

function pointInEllipseRaw(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): boolean {
  if (rx === 0 || ry === 0) return false;
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const r1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const r2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const r3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const r4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return (
    ((r1 > 0 && r2 < 0) || (r1 < 0 && r2 > 0)) &&
    ((r3 > 0 && r4 < 0) || (r3 < 0 && r4 > 0))
  );
}

function segmentToSegmentDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  return Math.min(
    distanceToSegment(ax, ay, cx, cy, dx, dy),
    distanceToSegment(cx, cy, ax, ay, bx, by),
    distanceToSegment(bx, by, cx, cy, dx, dy),
    distanceToSegment(dx, dy, ax, ay, bx, by),
  );
}

/* ------------------------------------------------------------------ */
/* Resize handle math                                                  */
/* ------------------------------------------------------------------ */

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export const RESIZE_HANDLE_SIZE_PX = 10;

export type ResizeHandlePos = {
  handle: ResizeHandle;
  x: number;
  y: number;
  cursor: string;
};

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

export function getResizeHandlePositions(
  b: { x: number; y: number; w: number; h: number },
): Array<ResizeHandlePos> {
  const { x, y, w, h } = b;
  return [
    { handle: "nw", x: x, y: y, cursor: HANDLE_CURSORS.nw },
    { handle: "n", x: x + w / 2, y: y, cursor: HANDLE_CURSORS.n },
    { handle: "ne", x: x + w, y: y, cursor: HANDLE_CURSORS.ne },
    { handle: "e", x: x + w, y: y + h / 2, cursor: HANDLE_CURSORS.e },
    { handle: "se", x: x + w, y: y + h, cursor: HANDLE_CURSORS.se },
    { handle: "s", x: x + w / 2, y: y + h, cursor: HANDLE_CURSORS.s },
    { handle: "sw", x: x, y: y + h, cursor: HANDLE_CURSORS.sw },
    { handle: "w", x: x, y: y + h / 2, cursor: HANDLE_CURSORS.w },
  ];
}

export function hitTestResizeHandle(
  b: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
  zoom: number,
): ResizeHandle | null {
  const r = RESIZE_HANDLE_SIZE_PX / zoom / 2;
  for (const pos of getResizeHandlePositions(b)) {
    if (Math.abs(x - pos.x) <= r && Math.abs(y - pos.y) <= r) {
      return pos.handle;
    }
  }
  return null;
}

/**
 * Compute new bounds for a rect/ellipse/text given a handle and drag delta.
 * Negative width or height is normalized to positive via the caller's
 * rectBounds helper.
 */
export function resizeBounds(
  start: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = start;
  if (handle.includes("e")) w = start.w + dx;
  if (handle.includes("s")) h = start.h + dy;
  if (handle.includes("w")) {
    x = start.x + dx;
    w = start.w - dx;
  }
  if (handle.includes("n")) {
    y = start.y + dy;
    h = start.h - dy;
  }
  return { x, y, w, h };
}
