"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import { PostCard } from "./PostCard";
import { PostDrawer } from "./PostDrawer";
import type { BoardPost } from "./PostCard";
import { POST_STATUSES } from "./PostCard";

type Column = {
  status: BoardPost["status"];
  count: number;
  posts: ReadonlyArray<BoardPost>;
};

type Props = {
  columns: ReadonlyArray<Column>;
};

export function PostLabClient({ columns }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const selected =
    columns.flatMap((c) => c.posts).find((p) => p.id === selectedId) ?? null;

  const open = isCreating || selected !== null;
  const mode: "create" | "edit" = isCreating ? "create" : "edit";

  return (
    <>
      {/* Top Bar */}
      <header className="bg-background border-outline-variant fixed top-0 right-0 left-20 z-40 flex h-16 items-center justify-between border-b px-margin-desktop">
        <div className="flex items-center gap-lg">
          <h1 className="font-headline-md text-headline-md text-primary font-bold">
            Content Lab
          </h1>
          <div className="bg-outline-variant h-6 w-px" />
          <span className="font-label-md text-on-surface-variant">Post Board</span>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-md">
            <button
              type="button"
              aria-label="Search"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              <MaterialIcon name="search" size={20} />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              <MaterialIcon name="notifications" size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-primary text-on-primary px-lg py-sm font-label-md hover:opacity-90 active:scale-95 uppercase transition-transform"
          >
            New Post
          </button>
        </div>
      </header>

      {/* Main Content: Kanban Board */}
      <main className="bg-background ml-20 mt-16 flex h-[calc(100vh-64px)] flex-1 overflow-x-auto overflow-y-hidden p-lg">
        <div className="flex h-full min-w-max gap-lg pb-lg">
          {columns.map((col) => {
            const isPosted = col.status === "POSTED";
            const title =
              POST_STATUSES.find((s) => s.status === col.status)?.title ??
              col.status;
            return (
              <div
                key={col.status}
                className="board-column bg-surface-container-low border-outline-variant flex h-full flex-col border"
              >
                <div className="bg-surface-container border-outline-variant flex items-center justify-between border-b p-md">
                  <span className="mono-label font-label-md">{title}</span>
                  <span className="font-metadata text-metadata text-on-surface-variant">
                    {String(col.count).padStart(2, "0")}
                  </span>
                </div>
                <div
                  className={`flex flex-1 flex-col gap-md overflow-y-auto p-md transition-all ${
                    isPosted
                      ? "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                      : ""
                  }`}
                >
                  {col.posts.length === 0 ? (
                    <div className="border-outline-variant flex h-24 items-center justify-center border border-dashed text-[12px] text-on-surface-variant">
                      {isPosted
                        ? "Archive is empty."
                        : "No posts in this stage."}
                    </div>
                  ) : (
                    col.posts.map((p) => (
                      <PostCard
                        key={p.id}
                        post={p}
                        onSelect={(id) => {
                          setIsCreating(false);
                          setSelectedId(id);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <PostDrawer
        key={isCreating ? "new" : (selectedId ?? "closed")}
        post={open && mode === "edit" ? selected : null}
        mode={mode}
        onClose={() => {
          setIsCreating(false);
          setSelectedId(null);
        }}
      />

      <style jsx global>{`
        .board-column {
          min-width: 320px;
          min-height: calc(100vh - 160px);
        }
        .mono-label {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          text-transform: uppercase;
        }
        .mission-card {
          cursor: pointer;
        }
        .mission-card:hover {
          border-color: var(--color-primary);
        }
      `}</style>
    </>
  );
}
