import { Sidebar } from "@/components/dashboard/Sidebar";
import { WeeklyReviewSkeleton } from "@/components/skeletons/WeeklyReviewSkeleton";

export default function WeeklyReviewLoading() {
  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <WeeklyReviewSkeleton />
    </div>
  );
}
