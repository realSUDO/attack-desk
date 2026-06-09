import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  WeeklyReviewClient,
  type ReviewItem,
} from "@/components/weekly-review/WeeklyReviewClient";
import { withRetry } from "@/lib/prisma";
import { getWeeklyReviews } from "@/db/queries/weekly-reviews";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewPage() {
  let reviews: ReviewItem[] = [];
  let databaseError: string | null = null;

  try {
    reviews = await withRetry(() => getWeeklyReviews());
  } catch {
    databaseError =
      "Database unavailable. Start PostgreSQL and configure DATABASE_URL.";
  }

  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <WeeklyReviewClient
        initialReviews={reviews}
        databaseError={databaseError}
      />
    </div>
  );
}
