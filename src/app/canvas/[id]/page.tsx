import { notFound } from "next/navigation";

import { getCanvasById } from "@/db/queries/canvases";
import { getMissionsWithRelations } from "@/db/queries/missions";
import { CanvasPage } from "@/components/canvas/CanvasPage";
import { migrateScene, type Scene } from "@/components/canvas/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const EMPTY_SCENE: Scene = {
  camera: { x: 0, y: 0, zoom: 1 },
  shapes: [],
};

async function loadSceneFromData(
  raw: unknown,
  fallback: Scene,
): Promise<Scene> {
  if (!raw || typeof raw !== "object") return fallback;
  const s = raw as Partial<Scene>;
  if (!Array.isArray(s.shapes) || !s.camera) return fallback;
  const loaded: Scene = {
    camera: {
      x: typeof s.camera.x === "number" ? s.camera.x : 0,
      y: typeof s.camera.y === "number" ? s.camera.y : 0,
      zoom: typeof s.camera.zoom === "number" ? s.camera.zoom : 1,
    },
    shapes: s.shapes as Scene["shapes"],
  };
  return migrateScene(loaded);
}

export default async function CanvasIdPage({ params }: { params: Params }) {
  const { id } = await params;

  let canvas: Awaited<ReturnType<typeof getCanvasById>> | null = null;
  try {
    canvas = await getCanvasById(id);
  } catch {
    canvas = null;
  }

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
          initialScene={EMPTY_SCENE}
          linked={{ missions: [], deadlines: [] }}
          availableMissions={[]}
        />
      );
    }
    notFound();
  }

  const initialScene = await loadSceneFromData(canvas.data, EMPTY_SCENE);

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
