import { withRetry } from "@/lib/prisma";
import { getCanvases } from "@/db/queries/canvases";
import { CanvasList } from "@/components/canvas/CanvasList";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

export default async function CanvasListPage() {
  let canvases: Array<{
    id: string;
    title: string;
    description: string | null;
    updatedAt: Date;
    missionCount: number;
    postIdeaCount: number;
  }> = [];
  let databaseAvailable = true;

  try {
    const list = await withRetry(() => getCanvases());
    canvases = list.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      updatedAt: c.updatedAt,
      missionCount: c._count.missions,
      postIdeaCount: c._count.postIdeas,
    }));
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
            Database unavailable. Start PostgreSQL and configure DATABASE_URL.
          </div>
        )}
      </main>
    </div>
  );
}
