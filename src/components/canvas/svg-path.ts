/**
 * Adapted from Excalidraw's `getSvgPathFromStroke` in their
 * `math.ts`. Converts the outline polygon returned by
 * perfect-freehand's `getStroke` into an SVG `path` `d` string.
 * (https://github.com/excalidraw/excalidraw/blob/main/packages/math.ts)
 */
export function getSvgPathFromStroke(stroke: ReadonlyArray<readonly [number, number]>): string {
  if (stroke.length === 0) return "";

  const d: string[] = [];
  d.push(`M${round(stroke[0]![0])},${round(stroke[0]![1])}`);
  for (let i = 1; i < stroke.length; i += 1) {
    const p1 = stroke[i - 1]!;
    const p2 = stroke[i]!;
    const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    d.push(`Q${round(p1[0])},${round(p1[1])} ${round(mid[0])},${round(mid[1])}`);
  }
  d.push(
    `L${round(stroke[stroke.length - 1]![0])},${round(stroke[stroke.length - 1]![1])}`,
  );
  d.push("Z");
  return d.join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
