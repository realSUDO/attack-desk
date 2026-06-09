import { Sidebar } from "@/components/dashboard/Sidebar";
import { WeeklyReviewClient } from "@/components/weekly-review/WeeklyReviewClient";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewPage() {
  const databaseAvailable = !!process.env.DATABASE_URL;

  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <WeeklyReviewClient databaseAvailable={databaseAvailable} />
    </div>
  );
}
