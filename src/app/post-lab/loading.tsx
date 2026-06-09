import { Sidebar } from "@/components/dashboard/Sidebar";
import { PostLabSkeleton } from "@/components/skeletons/PostLabSkeleton";

export default function PostLabLoading() {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <PostLabSkeleton />
    </div>
  );
}
