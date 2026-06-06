import { getCanvases } from "@/db/queries/canvases";
import { CanvasList } from "@/components/canvas/CanvasList";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

const SAMPLE_CANVASES: ReadonlyArray<{
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  missionCount: number;
  postIdeaCount: number;
}> = [
  {
    id: "sample-canvas-1",
    title: "Architectural Flow V1",
    description: "Workspace for Q4 planning, linked from Mission: Delta.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 2),
    missionCount: 1,
    postIdeaCount: 0,
  },
  {
    id: "sample-canvas-2",
    title: "Content Roadmap 2026",
    description: "Editorial calendar, theme buckets, and post ideas.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    missionCount: 0,
    postIdeaCount: 4,
  },
  {
    id: "sample-canvas-3",
    title: "User Interview Synthesis",
    description: "Affinity mapping for the Q3 research cohort.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    missionCount: 0,
    postIdeaCount: 0,
  },
];

export default async function CanvasListPage() {
  let canvases = SAMPLE_CANVASES;
  let databaseAvailable = true;

  try {
    const list = await getCanvases();
    if (list.length > 0) {
      canvases = list.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        updatedAt: c.updatedAt,
        missionCount: c._count.missions,
        postIdeaCount: c._count.postIdeas,
      }));
    }
  } catch {
    databaseAvailable = false;
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-20 flex flex-1 flex-col">
        <CanvasList canvases={canvases} />
        {!databaseAvailable && (
          <div className="fixed right-md bottom-md z-50 border border-outline-variant bg-surface-container px-md py-sm font-label-md text-on-surface-variant">
            Database offline — showing sample canvases.
          </div>
        )}
      </main>
    </div>
  );
}
