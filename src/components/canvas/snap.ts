import { SNAP_GRID_SIZE, SNAP_THRESHOLD, type Shape } from "./types";
import { shapeBounds } from "./geometry";

export type SnapGuide = {
  type: "v" | "h";
  /** axis position in world coords (x for v, y for h) */
  position: number;
  /** start / end along the perpendicular axis */
  start: number;
  end: number;
};

export type SnapResult = {
  dx: number;
  dy: number;
  guides: ReadonlyArray<SnapGuide>;
};

function snapToGrid(value: number): number {
  return Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
}

/**
 * Snap the dragging bounds to (a) a grid and (b) edges of other
 * shapes within SNAP_THRESHOLD world units. Returns the deltas to
 * apply to the dragged shape and the alignment guides to render.
 */
export function computeSnap(
  dragging: { x: number; y: number; w: number; h: number },
  allShapes: ReadonlyArray<Shape>,
  excludeIds: ReadonlySet<string>,
  options: { snapToShapes: boolean; snapToGrid: boolean },
): SnapResult {
  let dx = 0;
  let dy = 0;
  const guides: SnapGuide[] = [];

  if (options.snapToGrid) {
    const snappedX = snapToGrid(dragging.x);
    const snappedY = snapToGrid(dragging.y);
    dx = snappedX - dragging.x;
    dy = snappedY - dragging.y;
  }

  if (options.snapToShapes) {
    const draggingX = dragging.x + dx;
    const draggingY = dragging.y + dy;
    const draggingCenterX = draggingX + dragging.w / 2;
    const draggingCenterY = draggingY + dragging.h / 2;
    const draggingRight = draggingX + dragging.w;
    const draggingBottom = draggingY + dragging.h;

    let bestX: { snap: number; target: number; range: [number, number] } | null = null;
    let bestY: { snap: number; target: number; range: [number, number] } | null = null;

    for (const shape of allShapes) {
      if (excludeIds.has(shape.id)) continue;
      const b = shapeBounds(shape);
      const candidatesX: Array<{ snap: number; target: number }> = [
        { snap: draggingX, target: b.x },
        { snap: draggingCenterX, target: b.x + b.w / 2 },
        { snap: draggingRight, target: b.x + b.w },
      ];
      for (const c of candidatesX) {
        const delta = c.target - c.snap;
        if (Math.abs(delta) <= SNAP_THRESHOLD) {
          if (!bestX || Math.abs(delta) < Math.abs(bestX.snap - bestX.target)) {
            bestX = {
              snap: c.snap + delta,
              target: c.target,
              range: [b.y, b.y + b.h],
            };
          }
        }
      }
      const candidatesY: Array<{ snap: number; target: number }> = [
        { snap: draggingY, target: b.y },
        { snap: draggingCenterY, target: b.y + b.h / 2 },
        { snap: draggingBottom, target: b.y + b.h },
      ];
      for (const c of candidatesY) {
        const delta = c.target - c.snap;
        if (Math.abs(delta) <= SNAP_THRESHOLD) {
          if (!bestY || Math.abs(delta) < Math.abs(bestY.snap - bestY.target)) {
            bestY = {
              snap: c.snap + delta,
              target: c.target,
              range: [b.x, b.x + b.w],
            };
          }
        }
      }
    }

    if (bestX) {
      dx += bestX.snap - draggingX;
      guides.push({
        type: "v",
        position: bestX.target,
        start: bestX.range[0],
        end: bestX.range[1],
      });
    }
    if (bestY) {
      dy += bestY.snap - draggingY;
      guides.push({
        type: "h",
        position: bestY.target,
        start: bestY.range[0],
        end: bestY.range[1],
      });
    }
  }

  return { dx, dy, guides };
}
