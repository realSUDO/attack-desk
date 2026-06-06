import { Sidebar } from "@/components/dashboard/Sidebar";
import { PostLabClient } from "@/components/post-lab/PostLabClient";
import type { BoardPost } from "@/components/post-lab/PostCard";
import { getPosts } from "@/db/queries/posts";

export const dynamic = "force-dynamic";

export default async function PostLabPage() {
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  let databaseError: string | null = null;

  try {
    posts = await getPosts();
  } catch {
    databaseError =
      "Database unavailable. Start PostgreSQL and configure DATABASE_URL.";
  }

  const initialPosts: BoardPost[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    hook: post.hook,
    draft: post.draft,
    finalContent: post.finalContent,
    category: post.category,
    status: post.status,
    postedUrl: post.postedUrl,
    updatedAt: post.updatedAt,
  }));

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <PostLabClient
        initialPosts={initialPosts}
        databaseError={databaseError}
      />
    </div>
  );
}
