import { CanvasList } from "@/components/canvas/CanvasList";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

export default async function CanvasListPage() {
  const databaseAvailable = !!process.env.DATABASE_URL;

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-20 flex flex-1 flex-col">
        <CanvasList databaseAvailable={databaseAvailable} />
      </main>
    </div>
  );
}
