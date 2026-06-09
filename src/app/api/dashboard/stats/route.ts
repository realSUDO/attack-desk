import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { withRetry } from "@/lib/prisma";
import { getDashboardStats, emptyDashboardStats } from "@/db/queries/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(emptyDashboardStats);
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(emptyDashboardStats);
  }
  try {
    const stats = await withRetry(() => getDashboardStats(userId));
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(emptyDashboardStats);
  }
}
