import { getDeadlines } from "@/db/queries/deadlines";
import {
  getMissionsWithRelations,
  type MissionWithRelations,
} from "@/db/queries/missions";
import { BoardClient } from "@/components/board/BoardClient";
import { BoardHeader } from "@/components/board/BoardHeader";
import { DeadlineRadar } from "@/components/board/DeadlineRadar";
import { type BoardMission } from "@/components/board/MissionCard";
import { Sidebar } from "@/components/dashboard/Sidebar";

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

const sampleMissions: ReadonlyArray<BoardMission> = [
  {
    id: "sample-1",
    title: "Build API routes",
    description:
      "The routes need to handle real-time synchronization between the mission board and the underlying database. Ensure all endpoints are documented in the Canvas workspace for the frontend team.",
    status: "PLANNED",
    priority: "HIGH",
    dueDate: new Date(),
    category: "Backend",
    deadline: { id: "d1", title: "Next.js Project" },
    canvas: { id: "c1", title: "Next.js Project Canvas" },
  },
  {
    id: "sample-2",
    title: "Refactor Data Store",
    description:
      "Move from the legacy in-memory store to the new typed Prisma schema. Coordinate with the platform team to schedule the migration during low-traffic hours.",
    status: "PLANNED",
    priority: "MEDIUM",
    dueDate: new Date(Date.now() + 86400000),
    category: "Architecture",
    deadline: { id: "d2", title: "Architecture Docs" },
    canvas: null,
  },
  {
    id: "sample-3",
    title: "Fix Authentication Middleware",
    description:
      "Several sessions are expiring too early. Trace the JWT refresh path and make sure the middleware correctly re-issues tokens before the silent window closes.",
    status: "DOING",
    priority: "CRITICAL",
    dueDate: new Date(Date.now() + 2 * 3600000),
    category: "Security",
    deadline: { id: "d3", title: "Security Audit" },
    canvas: { id: "c2", title: "Auth Flow Map" },
  },
  {
    id: "sample-4",
    title: "User Interview Analysis",
    description: null,
    status: "DONE",
    priority: "LOW",
    dueDate: new Date(Date.now() - 86400000),
    category: "Research",
    deadline: null,
    canvas: null,
  },
];

const sampleDeadlines = [
  {
    id: "sd-1",
    title: "Build API routes",
    dueDate: new Date(new Date().setHours(16, 0, 0, 0)),
    priority: "HIGH" as const,
  },
  {
    id: "sd-2",
    title: "Marketing Assets",
    dueDate: new Date(Date.now() + 2 * 86400000),
    priority: "MEDIUM" as const,
  },
  {
    id: "sd-3",
    title: "Server Migration",
    dueDate: new Date(Date.now() + 4 * 86400000),
    priority: "MEDIUM" as const,
  },
  {
    id: "sd-4",
    title: "Q4 Planning",
    dueDate: new Date(Date.now() + 30 * 86400000),
    priority: "LOW" as const,
  },
];

export default async function BoardPage() {
  let rawMissions: ReadonlyArray<MissionWithRelations> = [];
  let rawDeadlines: ReadonlyArray<RawDeadline> = [];
  let databaseAvailable = true;

  try {
    [rawMissions, rawDeadlines] = await Promise.all([
      getMissionsWithRelations(),
      getDeadlines({ status: "ACTIVE" }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  const useSample = !databaseAvailable || rawMissions.length === 0;
  const missions: ReadonlyArray<BoardMission> = useSample
    ? sampleMissions
    : rawMissions.map(toBoardMission);
  const deadlines = useSample ? sampleDeadlines : rawDeadlines;

  const columns = [
    {
      status: "PLANNED" as const,
      title: "PLANNED",
      tone: "active" as const,
      missions: missions.filter((m) => m.status === "PLANNED"),
    },
    {
      status: "DOING" as const,
      title: "DOING",
      tone: "active" as const,
      missions: missions.filter((m) => m.status === "DOING"),
    },
    {
      status: "DONE" as const,
      title: "DONE",
      tone: "muted" as const,
      missions: missions.filter((m) => m.status === "DONE"),
    },
  ];

  return (
    <div className="bg-background overflow-hidden">
      <Sidebar />
      <BoardHeader />
      <main className="ml-20 mt-16 flex h-[calc(100vh-64px)] overflow-hidden">
        <BoardClient
          columns={columns.map((c) => ({
            status: c.status,
            title: c.title,
            count: c.missions.length,
            tone: c.tone,
            missions: c.missions,
          }))}
        />
        <DeadlineRadar deadlines={deadlines} />
      </main>
    </div>
  );
}
