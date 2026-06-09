import { Sidebar } from "@/components/dashboard/Sidebar";
import { CommandBarSkeleton } from "@/components/skeletons/CommandBarSkeleton";
import { DashboardGridSkeleton } from "@/components/skeletons/DashboardGridSkeleton";

export default function DashboardLoading() {
  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <main className="ml-0 flex min-h-screen flex-col md:ml-20">
        <CommandBarSkeleton />
        <DashboardGridSkeleton />
      </main>
    </div>
  );
}
