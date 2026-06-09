import { Sidebar } from "@/components/dashboard/Sidebar";
import { CanvasListSkeleton } from "@/components/skeletons/CanvasListSkeleton";

export default function CanvasListLoading() {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-0 flex flex-1 flex-col md:ml-20">
        <CanvasListSkeleton />
      </main>
    </div>
  );
}
