import type { PostStatus } from "@prisma/client";

export type BoardPost = {
  id: string;
  title: string;
  hook: string | null;
  draft: string | null;
  finalContent: string | null;
  category: string | null;
  status: PostStatus;
  postedUrl: string | null;
  updatedAt: Date;
};

export const POST_STATUSES: ReadonlyArray<{
  status: PostStatus;
  title: string;
}> = [
  { status: "IDEA", title: "Ideas" },
  { status: "DRAFTING", title: "Drafting" },
  { status: "READY", title: "Ready" },
  { status: "POSTED", title: "Posted" },
];

export const POST_CATEGORIES: ReadonlyArray<string> = [
  "Next.js",
  "React",
  "Productivity",
  "Design",
  "Strategy",
  "Tech",
];

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function excerpt(post: BoardPost, maxLen = 140): string {
  const source = post.hook ?? post.draft ?? post.finalContent ?? "";
  if (source.length <= maxLen) return source;
  return `${source.slice(0, maxLen).trimEnd()}…`;
}

type Props = {
  post: BoardPost;
  onSelect: (id: string) => void;
};

export function PostCard({ post, onSelect }: Props) {
  const text = excerpt(post);
  const isPosted = post.status === "POSTED";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(post.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(post.id);
        }
      }}
      className="mission-card bg-surface p-md border border-outline-variant hover:border-primary focus:border-primary focus:outline-hidden cursor-pointer transition-colors"
      aria-label={`Edit ${post.title}`}
    >
      {post.category && (
        <span className="font-label-sm text-on-secondary-container bg-secondary-container px-sm py-xs mb-sm inline-block">
          {post.category}
        </span>
      )}
      <h3 className="font-headline-md text-headline-md mb-sm">{post.title}</h3>
      <p className="font-body-md text-on-surface-variant line-clamp-2 mb-sm">
        {text}
      </p>
      {isPosted && (
        <span className="font-metadata text-on-surface-variant text-[10px] uppercase">
          {relativeTime(post.updatedAt)}
        </span>
      )}
    </div>
  );
}

