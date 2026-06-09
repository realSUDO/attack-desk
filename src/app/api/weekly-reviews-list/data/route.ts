import { NextResponse } from "next/server";
import { withRetry } from "@/lib/prisma";
import { getWeeklyReviews } from "@/db/queries/weekly-reviews";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }
  try {
    const reviews = await withRetry(() => getWeeklyReviews());
    const data = reviews.map((r) => ({
      id: r.id,
      weekStart: r.weekStart.toISOString(),
      weekEnd: r.weekEnd.toISOString(),
      wentRight: r.wentRight,
      wentWrong: r.wentWrong,
      nextPlan: r.nextPlan,
      finalNote: r.finalNote,
    }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
