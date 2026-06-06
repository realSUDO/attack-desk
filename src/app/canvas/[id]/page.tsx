import { notFound } from "next/navigation";

import { getCanvasById } from "@/db/queries/canvases";
import { getMissionsWithRelations } from "@/db/queries/missions";
import { CanvasPage } from "@/components/canvas/CanvasPage";
import type { Scene } from "@/components/canvas/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const SAMPLE_SCENE: Scene = {
  camera: { x: 0, y: 0, zoom: 1 },
  shapes: [
    {
      id: "sample-mission",
      type: "rect",
      x: 240,
      y: 160,
      width: 256,
      height: 140,
      z: 1,
      stroke: "#1e1b15",
      fill: "#fff8f1",
      fillPattern: "solid",
      strokeWidth: 2,
    },
    {
      id: "sample-note",
      type: "text",
      x: 260,
      y: 180,
      z: 2,
      stroke: "#1e1b15",
      fill: "transparent",
      fillPattern: "none",
      strokeWidth: 2,
      text: "Q4 Strategic Roadmap\nHigh-priority milestones.",
      fontSize: 18,
    },
    {
      id: "sample-arrow",
      type: "arrow",
      x: 320,
      y: 200,
      z: 3,
      stroke: "#c9f308",
      fill: "transparent",
      fillPattern: "none",
      strokeWidth: 3,
      points: [
        [0, 0],
        [200, 100],
      ],
    },
    {
      id: "sample-ellipse",
      type: "ellipse",
      x: 540,
      y: 280,
      width: 160,
      height: 80,
      z: 4,
      stroke: "#1e1b15",
      fill: "#c9f308",
      fillPattern: "solid",
      strokeWidth: 2,
    },
  ],
};

async function loadSceneFromData(
  raw: unknown,
  fallback: Scene,
): Promise<Scene> {
  if (!raw || typeof raw !== "object") return fallback;
  const s = raw as Partial<Scene>;
  if (!Array.isArray(s.shapes) || !s.camera) return fallback;
  return {
    camera: {
      x: typeof s.camera.x === "number" ? s.camera.x : 0,
      y: typeof s.camera.y === "number" ? s.camera.y : 0,
      zoom: typeof s.camera.zoom === "number" ? s.camera.zoom : 1,
    },
    shapes: s.shapes as Scene["shapes"],
  };
}

export default async function CanvasIdPage({ params }: { params: Params }) {
  const { id } = await params;

  let canvas: Awaited<ReturnType<typeof getCanvasById>> | null = null;
  try {
    canvas = await getCanvasById(id);
  } catch {
    canvas = null;
  }

  // For "new" sample canvases (or when DB is down), create a sample scene
  if (!canvas) {
    if (id === "sample-canvas-1" || id === "sample-canvas-2" || id === "sample-canvas-3") {
      return (
        <CanvasPage
          canvasId={id}
          initialTitle={
            id === "sample-canvas-1"
              ? "Architectural Flow V1"
              : id === "sample-canvas-2"
                ? "Content Roadmap 2026"
                : "User Interview Synthesis"
          }
          initialScene={SAMPLE_SCENE}
          linked={{ missions: [], deadlines: [] }}
          availableMissions={[]}
        />
      );
    }
    notFound();
  }

  const initialScene = await loadSceneFromData(canvas.data, SAMPLE_SCENE);

  // Available missions to link: those not already on another canvas
  let availableMissions: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }> = [];
  try {
    const allMissions = await getMissionsWithRelations();
    availableMissions = allMissions
      .filter((m) => m.canvasId === null || m.canvasId === id)
      .map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        priority: m.priority,
      }));
  } catch {
    // ignore
  }

  return (
    <CanvasPage
      canvasId={id}
      initialTitle={canvas.title}
      initialScene={initialScene}
      linked={{
        missions: canvas.missions.map((m) => ({ id: m.id, title: m.title })),
        deadlines: canvas.deadline
          ? [{ id: canvas.deadline.id, title: canvas.deadline.title }]
          : [],
      }}
      availableMissions={availableMissions}
    />
  );
}
