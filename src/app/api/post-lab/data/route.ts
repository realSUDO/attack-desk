import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { withRetry } from "@/lib/prisma";
import { getPosts } from "@/db/queries/posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json([]);
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }
  try {
    const posts = await withRetry(() => getPosts({}, userId));
    const data = posts.map((post) => ({
      id: post.id,
      title: post.title,
      hook: post.hook,
      draft: post.draft,
      finalContent: post.finalContent,
      category: post.category,
      status: post.status,
      postedUrl: post.postedUrl,
      updatedAt: post.updatedAt.toISOString(),
    }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
