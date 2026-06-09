import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { withRetry } from "@/lib/prisma";
import {
  getMissionsWithRelations,
} from "@/db/queries/missions";
import { getDeadlines } from "@/db/queries/deadlines";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ missions: [], deadlines: [] });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ missions: [], deadlines: [] });
  }
  try {
    const [rawMissions, rawDeadlines] = await withRetry(() => Promise.all([
      getMissionsWithRelations({}, userId),
      getDeadlines({ status: "ACTIVE" }, userId),
    ]));
    const missions = rawMissions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      priority: m.priority,
      dueDate: m.dueDate?.toISOString() ?? null,
      category: m.category,
      deadline: m.deadline
        ? { id: m.deadline.id, title: m.deadline.title }
        : null,
      canvas: m.canvas ? { id: m.canvas.id, title: m.canvas.title } : null,
    }));
    const deadlines = rawDeadlines.map((d) => ({
      id: d.id,
      title: d.title,
      dueDate: d.dueDate.toISOString(),
      priority: d.priority,
    }));
    return NextResponse.json({ missions, deadlines });
  } catch {
    return NextResponse.json({ missions: [], deadlines: [] });
  }
}
