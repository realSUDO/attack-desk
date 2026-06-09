import { getDeadlines } from "@/db/queries/deadlines";
import {
  getMissionsWithRelations,
  type MissionWithRelations,
} from "@/db/queries/missions";
import { BoardClient } from "@/components/board/BoardClient";
import { type BoardMission } from "@/components/board/MissionCard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RawDeadline = Awaited<ReturnType<typeof getDeadlines>>[number];

const toBoardMission = (m: MissionWithRelations): BoardMission => ({
  id: m.id,
  title: m.title,
  description: m.description,
  status: m.status,
  priority: m.priority,
  dueDate: m.dueDate,
  category: m.category,
  deadline: m.deadline
    ? { id: m.deadline.id, title: m.deadline.title }
    : null,
  canvas: m.canvas ? { id: m.canvas.id, title: m.canvas.title } : null,
});

export default async function BoardPage() {
  let rawMissions: ReadonlyArray<MissionWithRelations> = [];
  let rawDeadlines: ReadonlyArray<RawDeadline> = [];
  let databaseError: string | null = null;

  try {
    [rawMissions, rawDeadlines] = await withRetry(() => Promise.all([
      getMissionsWithRelations(),
      getDeadlines({ status: "ACTIVE" }),
    ]));
  } catch {
    databaseError =
      "Database unavailable. Start PostgreSQL and configure DATABASE_URL.";
  }

  const missions: ReadonlyArray<BoardMission> =
    rawMissions.map(toBoardMission);

  return (
    <div className="bg-background overflow-hidden">
      <Sidebar />
      <BoardClient
        initialMissions={missions}
        deadlines={rawDeadlines}
        databaseError={databaseError}
      />
    </div>
  );
}
