import { Sidebar } from "@/components/dashboard/Sidebar";
import { PostLabClient } from "@/components/post-lab/PostLabClient";

export const dynamic = "force-dynamic";

export default async function PostLabPage() {
  const databaseAvailable = !!process.env.DATABASE_URL;

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <PostLabClient databaseAvailable={databaseAvailable} />
    </div>
  );
}
