import { getPosts } from "@/db/queries/posts";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PostLabClient } from "@/components/post-lab/PostLabClient";
import { POST_STATUSES } from "@/components/post-lab/PostCard";
import type { BoardPost } from "@/components/post-lab/PostCard";

export const dynamic = "force-dynamic";

function now(): Date {
  return new Date();
}

const samplePosts: ReadonlyArray<BoardPost> = [
  {
    id: "sample-idea-1",
    title: "Server Actions finally clicked",
    hook: "I stopped thinking of them as APIs and started seeing them as RPC calls that live right next to my UI components.",
    draft: null,
    finalContent: null,
    category: "Next.js",
    status: "IDEA",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 2),
  },
  {
    id: "sample-idea-2",
    title: "The 4px Baseline Philosophy",
    hook: "Why mathematical precision in layout leads to cognitive ease for users, and how brutalism forced the issue.",
    draft: null,
    finalContent: null,
    category: "Productivity",
    status: "IDEA",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 5),
  },
  {
    id: "sample-idea-3",
    title: "Why I stopped using CSS variables for everything",
    hook: "Token systems have a cognitive cost. Sometimes a hardcoded hex is the right call.",
    draft: null,
    finalContent: null,
    category: "Design",
    status: "IDEA",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: "sample-idea-4",
    title: "The death of the side project",
    hook: "Building in public killed the indie web. Maybe that's fine.",
    draft: null,
    finalContent: null,
    category: "Strategy",
    status: "IDEA",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 24 * 4),
  },
  {
    id: "sample-drafting-1",
    title: "Beyond Glassmorphism",
    hook: "The return of structural minimalism and high-contrast editorial layouts in 2026.",
    draft:
      "Glassmorphism had a good run. From 2020 to 2024 it carried an entire generation of design language on its translucent back. But you can feel it fading — every new SaaS dashboard looks like it shipped from the same Figma community template.\n\nWhat replaces it? Hard borders. Sharp corners. Editorial grids. Type that earns its 32px line-height.",
    finalContent: null,
    category: "Design",
    status: "DRAFTING",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 2),
  },
  {
    id: "sample-drafting-2",
    title: "Server components, one year later",
    hook: "The promise was zero-JS interactivity. The reality is more interesting.",
    draft:
      "A year ago I would have told you server components were a build-time optimization. I was wrong.\n\nWhat they actually do is relocate the boundary between 'client state' and 'server state' to a place that matches how you actually think about your app. The data lives in the database, the rendering lives on the server, and the interactivity lives in the few places you actually need it.",
    finalContent: null,
    category: "Next.js",
    status: "DRAFTING",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 8),
  },
  {
    id: "sample-ready-1",
    title: "Why Content Labs Matter",
    hook: "Moving from chaotic posting to structured thematic content development is the only sustainable strategy.",
    draft:
      "Most creators I know treat their content calendar like a slot machine. They pull the lever, hope for engagement, and iterate based on vibes.\n\nThe post lab is a different model. It treats content the way a product team treats features: ideas are tickets, drafts are PRs, and shipping is a release. Same rigor, same quality bar, but applied to the part of the work that actually moves the needle.",
    finalContent: null,
    category: "Strategy",
    status: "READY",
    postedUrl: null,
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 24),
  },
  {
    id: "sample-posted-1",
    title: "Rust for Front-end Devs",
    hook: "A guide to understanding memory safety without the headache.",
    draft: null,
    finalContent:
      "You don't need to write Rust to benefit from understanding it. The mental model — ownership, borrowing, lifetimes — is portable to every language you touch.",
    category: "Tech",
    status: "POSTED",
    postedUrl: "https://example.com/rust-for-fe-devs",
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: "sample-posted-2",
    title: "Tailwind v4: the CSS-first pivot",
    hook: "Tailwind 4 stopped pretending to be a utility framework. It's a CSS framework now.",
    draft: null,
    finalContent:
      "The @theme directive is the most important change. It means Tailwind is no longer a separate system you bolt onto CSS — it IS CSS. The cascade works. The cascade is the point.",
    category: "Next.js",
    status: "POSTED",
    postedUrl: "https://example.com/tailwind-v4",
    updatedAt: new Date(now().getTime() - 1000 * 60 * 60 * 24 * 14),
  },
];

export default async function PostLabPage() {
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  let databaseAvailable = true;

  try {
    posts = await getPosts();
  } catch {
    databaseAvailable = false;
  }

  const source = posts.length > 0 ? posts : samplePosts;

  const columns = POST_STATUSES.map(({ status }) => {
    const inStatus = source.filter((p) => p.status === status);
    return {
      status,
      count: inStatus.length,
      posts: inStatus.map<BoardPost>((p) => ({
        id: p.id,
        title: p.title,
        hook: p.hook,
        draft: p.draft,
        finalContent: p.finalContent,
        category: p.category,
        status: p.status,
        postedUrl: p.postedUrl,
        updatedAt: p.updatedAt,
      })),
    };
  });

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <PostLabClient columns={columns} />
      {!databaseAvailable && (
        <div className="fixed right-md bottom-md z-50 border border-outline-variant bg-surface-container px-md py-sm font-label-md text-on-surface-variant">
          Database offline — showing sample posts.
        </div>
      )}
    </div>
  );
}
