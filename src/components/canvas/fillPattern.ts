import type { FillPattern } from "./types";

const patternCache = new Map<string, HTMLImageElement>();

export function getFillPatternImage(
  pattern: FillPattern,
  fill: string,
  stroke: string,
): HTMLImageElement | undefined {
  if (pattern === "none" || pattern === "solid") return undefined;
  if (typeof document === "undefined") return undefined;

  const key = `${pattern}:${fill}:${stroke}`;
  const cached = patternCache.get(key);
  if (cached) return cached;

  const size = pattern === "dots" ? 12 : 10;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  if (fill !== "transparent") {
    context.fillStyle = fill;
    context.fillRect(0, 0, size, size);
  }

  context.strokeStyle = stroke;
  context.fillStyle = stroke;
  context.globalAlpha = 0.32;
  context.lineWidth = 1;

  if (pattern === "dots") {
    context.beginPath();
    context.arc(size / 2, size / 2, 1.25, 0, Math.PI * 2);
    context.fill();
  } else {
    drawDiagonal(context, size);
    if (pattern === "cross-hatch") {
      context.save();
      context.translate(size, 0);
      context.scale(-1, 1);
      drawDiagonal(context, size);
      context.restore();
    }
  }

  const patternImage = canvas as unknown as HTMLImageElement;
  patternCache.set(key, patternImage);
  return patternImage;
}

function drawDiagonal(
  context: CanvasRenderingContext2D,
  size: number,
): void {
  context.beginPath();
  context.moveTo(-size / 2, size);
  context.lineTo(size / 2, 0);
  context.moveTo(size / 2, size);
  context.lineTo(size * 1.5, 0);
  context.stroke();
}
