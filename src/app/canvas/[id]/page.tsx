import { notFound } from "next/navigation";

import { getCanvasById } from "@/db/queries/canvases";
import { getMissionsWithRelations } from "@/db/queries/missions";
import { CanvasPage } from "@/components/canvas/CanvasPage";
import { EMPTY_SCENE, parseScene, type Scene } from "@/components/canvas/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CanvasIdPage({ params }: { params: Params }) {
  const { id } = await params;

  let canvas: Awaited<ReturnType<typeof getCanvasById>> | null = null;
  try {
    canvas = await getCanvasById(id);
  } catch {
    canvas = null;
  }

  if (!canvas) {
    if (
      id === "sample-canvas-1" ||
      id === "sample-canvas-2" ||
      id === "sample-canvas-3"
    ) {
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

  const initialScene: Scene = parseScene(canvas.data);

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
