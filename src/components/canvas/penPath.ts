import { getStroke } from "perfect-freehand";

type Point = readonly [number, number, number];

export function getPenPathData(
  points: ReadonlyArray<Point>,
  size: number,
): string {
  if (points.length < 2) return "";
  const stroke = getStroke(points as Array<[number, number, number]>, {
    size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
    last: true,
  });
  if (stroke.length === 0) return "";
  const d: Array<string> = [];
  d.push(`M ${stroke[0]![0].toFixed(2)} ${stroke[0]![1].toFixed(2)}`);
  for (let i = 1; i < stroke.length; i += 1) {
    const a = stroke[i - 1]!;
    const b = stroke[i]!;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    d.push(`Q ${a[0].toFixed(2)} ${a[1].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`);
  }
  d.push("Z");
  return d.join(" ");
}
