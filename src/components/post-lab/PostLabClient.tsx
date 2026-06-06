"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import { apiRequest } from "@/lib/client-api";

import { PostCard, POST_STATUSES, type BoardPost } from "./PostCard";
import { PostDrawer, type PostInput } from "./PostDrawer";

type Props = {
  initialPosts: ReadonlyArray<BoardPost>;
  databaseError?: string | null;
};

function normalizePost(post: BoardPost): BoardPost {
  return { ...post, updatedAt: new Date(post.updatedAt) };
}

export function PostLabClient({ initialPosts, databaseError = null }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLElement>(null);
  const [posts, setPosts] = useState(() => initialPosts.map(normalizePost));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(databaseError);
  const [isSaving, setIsSaving] = useState(false);
  const selected = posts.find((post) => post.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) =>
      [post.title, post.hook, post.draft, post.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [posts, search]);

  const closeDrawer = () => {
    setIsCreating(false);
    setSelectedId(null);
    setError(null);
  };

  const savePost = async (input: PostInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (isCreating) {
        const created = normalizePost(
          await apiRequest<BoardPost>("/api/posts", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        );
        setPosts((current) => [...current, created]);
      } else if (selected) {
        const previous = selected;
        const optimistic = {
          ...selected,
          ...input,
          updatedAt: new Date(),
        };
        setPosts((current) =>
          current.map((post) => post.id === selected.id ? optimistic : post),
        );
        try {
          const updated = normalizePost(
            await apiRequest<BoardPost>(`/api/posts/${selected.id}`, {
              method: "PATCH",
              body: JSON.stringify(input),
            }),
          );
          setPosts((current) =>
            current.map((post) => post.id === selected.id ? updated : post),
          );
        } catch (requestError) {
          setPosts((current) =>
            current.map((post) => post.id === previous.id ? previous : post),
          );
          throw requestError;
        }
      }
      closeDrawer();
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to save post",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deletePost = async () => {
    if (!selected || !window.confirm(`Delete "${selected.title}"?`)) return;
    const previous = posts;
    setPosts((current) => current.filter((post) => post.id !== selected.id));
    setIsSaving(true);
    try {
      await apiRequest<BoardPost>(`/api/posts/${selected.id}`, {
        method: "DELETE",
      });
      closeDrawer();
      router.refresh();
    } catch (requestError) {
      setPosts(previous);
      setError(
        requestError instanceof Error ? requestError.message : "Unable to delete post",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="bg-background border-outline-variant fixed top-0 right-0 left-20 z-40 flex h-16 items-center justify-between border-b px-margin-desktop">
        <div className="flex items-center gap-lg">
          <h1 className="font-headline-md text-primary font-bold">Content Lab</h1>
          <div className="border-outline-variant bg-surface-container flex items-center border px-md py-xs">
            <MaterialIcon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts..."
              className="font-label-md w-64 border-none bg-transparent outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="bg-primary text-on-primary px-lg py-sm font-label-md uppercase"
        >
          New Post
        </button>
      </header>

      <main
        ref={scrollRef}
        className="board-scroll bg-background ml-20 mt-16 flex h-[calc(100vh-64px)] overflow-x-auto overflow-y-hidden p-lg"
      >
        <div className="flex h-full min-w-max gap-lg pb-lg">
          {POST_STATUSES.map(({ status, title }) => {
            const columnPosts = filtered.filter((post) => post.status === status);
            return (
              <div
                key={status}
                className="bg-surface-container-low border-outline-variant flex h-full w-[560px] shrink-0 flex-col border"
              >
                <div className="bg-surface-container border-outline-variant flex items-center justify-between border-b p-md">
                  <span className="mono-label font-label-md">{title}</span>
                  <span className="font-metadata text-on-surface-variant">
                    {String(columnPosts.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-md overflow-y-auto p-md">
                  {columnPosts.length === 0 ? (
                    <div className="border-outline-variant flex h-24 items-center justify-center border border-dashed text-xs text-on-surface-variant">
                      {search ? "No matching posts." : "No posts in this stage."}
                    </div>
                  ) : (
                    columnPosts.map((post) => (
                      <PostCard key={post.id} post={post} onSelect={setSelectedId} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      {databaseError && (
        <p className="border-error text-error fixed right-md bottom-md z-50 border bg-background p-sm text-sm">
          {databaseError}
        </p>
      )}
      <PostDrawer
        key={isCreating ? "new" : (selectedId ?? "closed")}
        post={selected}
        mode={isCreating ? "create" : "edit"}
        error={error}
        isSaving={isSaving}
        onClose={closeDrawer}
        onSave={savePost}
        onDelete={deletePost}
      />
    </>
  );
}
