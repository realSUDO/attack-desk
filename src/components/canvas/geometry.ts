import type { Shape, PenShape, RectShape, EllipseShape, TextShape, ArrowShape } from "./types";

export type Vec2 = readonly [number, number];

export function distance(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
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

  // Catmull-Rom -> Bezier smoothing. We use the standard trick of converting
  // every four control points (p0, p1, p2, p3) into a cubic bezier segment
  // between p1 and p2, with the curve passing through both endpoints.
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
  // Approximate text width: 0.6em per char, height = 1.2em.
  const charWidth = shape.fontSize * 0.6;
  const lines = shape.text.split("\n");
  const w = Math.max(...lines.map((l) => l.length)) * charWidth;
  const h = lines.length * shape.fontSize * 1.2;
  return { x: shape.x, y: shape.y, w, h };
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

export function shapeBounds(shape: Shape): { x: number; y: number; w: number; h: number } {
  switch (shape.type) {
    case "pen":
      return penBounds(shape);
    case "rect":
      return rectBounds(shape);
    case "ellipse":
      return ellipseBounds(shape);
    case "text":
      return textBounds(shape);
    case "arrow":
      return penBounds({ ...shape, type: "pen" });
  }
}

export function pointInRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function pointInEllipse(px: number, py: number, e: { x: number; y: number; w: number; h: number }): boolean {
  if (e.w === 0 || e.h === 0) return false;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const dx = (px - cx) / (e.w / 2);
  const dy = (py - cy) / (e.h / 2);
  return dx * dx + dy * dy <= 1;
}

export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance([px, py], [x1, y1]);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return distance([px, py], [x1 + t * dx, y1 + t * dy]);
}

export function hitTestShape(shape: Shape, x: number, y: number, tolerance: number): boolean {
  switch (shape.type) {
    case "rect": {
      const b = rectBounds(shape);
      return pointInRect(x, y, { x: b.x - tolerance, y: b.y - tolerance, w: b.w + 2 * tolerance, h: b.h + 2 * tolerance });
    }
    case "ellipse": {
      const b = ellipseBounds(shape);
      return pointInEllipse(x, y, b);
    }
    case "text": {
      const b = textBounds(shape);
      return pointInRect(x, y, { x: b.x - tolerance, y: b.y - tolerance, w: b.w + 2 * tolerance, h: b.h + 2 * tolerance });
    }
    case "pen":
    case "arrow": {
      for (let i = 0; i < shape.points.length - 1; i += 1) {
        const a = shape.points[i]!;
        const b = shape.points[i + 1]!;
        const d = distanceToSegment(x, y, shape.x + a[0], shape.y + a[1], shape.x + b[0], shape.y + b[1]);
        if (d <= tolerance) return true;
      }
      return false;
    }
  }
}

export function arrowPath(shape: ArrowShape): { line: string; head: string } {
  if (shape.points.length < 2) return { line: "", head: "" };
  const start = shape.points[0]!;
  const end = shape.points[shape.points.length - 1]!;
  const sx = shape.x + start[0];
  const sy = shape.y + start[1];
  const ex = shape.x + end[0];
  const ey = shape.y + end[1];
  const angle = Math.atan2(ey - sy, ex - sx);
  const headLen = 12;
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
