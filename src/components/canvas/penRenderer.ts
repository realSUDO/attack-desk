import { getStroke } from "perfect-freehand";

import { getSvgPathFromStroke } from "./svg-path";

export type PenInputPoint = readonly [number, number, number];

/**
 * Generate the closed outline polygon of a pen stroke using
 * perfect-freehand. The output is what the renderer fills. The
 * thickness varies along the stroke based on velocity (or pressure
 * if supplied).
 */
export function getPenOutlinePath(
  points: ReadonlyArray<PenInputPoint>,
  size: number,
): string {
  if (points.length < 2) return "";
  const outline = getStroke(
    points.map(([x, y, p]) => [x, y, p] as [number, number, number]),
    {
      size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => t,
      simulatePressure: true,
      last: true,
    },
  );
  return getSvgPathFromStroke(outline);
}
