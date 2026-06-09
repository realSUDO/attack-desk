import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { withRetry } from "@/lib/prisma";
import { getCanvases } from "@/db/queries/canvases";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json([]);
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }
  try {
    const list = await withRetry(() => getCanvases(userId));
    const data = list.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      updatedAt: c.updatedAt.toISOString(),
      missionCount: c._count.missions,
      postIdeaCount: c._count.postIdeas,
    }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
