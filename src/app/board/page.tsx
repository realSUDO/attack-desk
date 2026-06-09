import { BoardClient } from "@/components/board/BoardClient";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const databaseAvailable = !!process.env.DATABASE_URL;

  return (
    <div className="bg-background overflow-hidden">
      <Sidebar />
      <BoardClient databaseAvailable={databaseAvailable} />
    </div>
  );
}
