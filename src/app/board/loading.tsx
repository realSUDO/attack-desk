import { Sidebar } from "@/components/dashboard/Sidebar";
import { BoardSkeleton } from "@/components/skeletons/BoardSkeleton";

export default function BoardLoading() {
  return (
    <div className="bg-background overflow-hidden">
      <Sidebar />
      <BoardSkeleton />
    </div>
  );
}
