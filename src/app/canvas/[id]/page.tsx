import { auth } from "@/auth";
import { getCanvasById } from "@/db/queries/canvases";
import { getMissionsWithRelations } from "@/db/queries/missions";
import { CanvasPageWrapper } from "@/components/canvas/CanvasPageWrapper";
import { parseScene, type Scene, EMPTY_SCENE } from "@/components/canvas/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CanvasIdPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  let canvasTitle = "Canvas";
  let initialScene: Scene = EMPTY_SCENE;
  let linked = { missions: [] as Array<{ id: string; title: string }>, deadlines: [] as Array<{ id: string; title: string }> };
  let availableMissions: Array<{ id: string; title: string; status: string; priority: string }> = [];

  try {
    if (!userId) throw new Error("Not authenticated");
    const canvas = await getCanvasById(id, userId);
    if (canvas) {
      canvasTitle = canvas.title;
      initialScene = parseScene(canvas.data);
      linked = {
        missions: canvas.missions.map((m) => ({ id: m.id, title: m.title })),
        deadlines: canvas.deadline
          ? [{ id: canvas.deadline.id, title: canvas.deadline.title }]
          : [],
      };

      const allMissions = await getMissionsWithRelations({}, userId);
      availableMissions = allMissions
        .filter((m) => m.canvasId === null || m.canvasId === id)
        .map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          priority: m.priority,
        }));
    }
  } catch {
    // Fall through — the client wrapper handles anonymous localStorage
  }

  return (
    <CanvasPageWrapper
      canvasId={id}
      initialTitle={canvasTitle}
      initialScene={initialScene}
      linked={linked}
      availableMissions={availableMissions}
    />
  );
}
