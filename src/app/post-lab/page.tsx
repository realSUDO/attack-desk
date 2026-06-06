import { getPosts } from "@/db/queries/posts";

export const dynamic = "force-dynamic";

export default async function PostLabPage() {
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  let databaseAvailable = true;

  try {
    posts = await getPosts();
  } catch {
    databaseAvailable = false;
  }

  return (
    <main>
      <h1>Post Lab</h1>
      {!databaseAvailable && <p>Database is currently unavailable.</p>}
      {(["IDEA", "DRAFTING", "READY", "POSTED"] as const).map((status) => (
        <section key={status}>
          <h2>{status}</h2>
          <ul>
            {posts
              .filter((post) => post.status === status)
              .map((post) => (
                <li key={post.id}>{post.title}</li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
