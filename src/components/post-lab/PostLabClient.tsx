"use client";

import { useEffect, useRef, useState } from "react";

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

const COLUMN_WIDTH = 630;
const COLUMN_GAP = 24;
const SLIDE_STEP = COLUMN_WIDTH + COLUMN_GAP;

export function PostLabClient({ columns }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const dragState = useRef<{
    startX: number;
    startScrollLeft: number;
    pointerId: number | null;
  } | null>(null);
  const didDragRef = useRef(false);

  const selected =
    columns.flatMap((c) => c.posts).find((p) => p.id === selectedId) ?? null;

  const open = isCreating || selected !== null;
  const mode: "create" | "edit" = isCreating ? "create" : "edit";

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (!scrollRef.current) return;
    dragState.current = {
      startX: e.clientX,
      startScrollLeft: scrollRef.current.scrollLeft,
      pointerId: e.pointerType === "mouse" ? null : e.pointerId,
    };
    didDragRef.current = false;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 && e.deltaX === 0) return;
      e.preventDefault();
      const raw = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      el.scrollLeft += raw * 0.6;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state || !scrollRef.current) return;
      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > 4) {
        didDragRef.current = true;
        if (!isDragging) setIsDragging(true);
      }
      scrollRef.current.scrollLeft = state.startScrollLeft - dx;
    };
    const onUp = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      if (
        state.pointerId !== null &&
        e.pointerId !== state.pointerId
      ) {
        return;
      }
      dragState.current = null;
      setIsDragging(false);
    };
    const onCancel = () => {
      dragState.current = null;
      didDragRef.current = false;
      setIsDragging(false);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
    };
  }, [isDragging]);

  const handleCardSelect = (id: string) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setIsCreating(false);
    setSelectedId(id);
  };

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
      <main
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        className={`board-scroll bg-background ml-20 mt-16 flex h-[calc(100vh-64px)] flex-1 overflow-x-auto overflow-y-hidden p-lg ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        <button
          type="button"
          aria-label="Previous column"
          onClick={() => {
            scrollRef.current?.scrollBy({ left: -SLIDE_STEP, behavior: "smooth" });
          }}
          className="border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary fixed top-1/2 left-20 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center border bg-background transition-colors"
        >
          <MaterialIcon name="chevron_left" size={20} />
        </button>
        <button
          type="button"
          aria-label="Next column"
          onClick={() => {
            scrollRef.current?.scrollBy({ left: SLIDE_STEP, behavior: "smooth" });
          }}
          className="border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary fixed top-1/2 right-0 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center border bg-background transition-colors"
        >
          <MaterialIcon name="chevron_right" size={20} />
        </button>

        <div className="flex h-full min-w-max gap-lg pb-lg">
          {columns.map((col) => {
            const isPosted = col.status === "POSTED";
            const title =
              POST_STATUSES.find((s) => s.status === col.status)?.title ??
              col.status;
            return (
              <div
                key={col.status}
                className="board-column bg-surface-container-low border-outline-variant flex h-full w-[630px] shrink-0 flex-col border scroll-snap-align-start"
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
                        onSelect={handleCardSelect}
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
        .board-scroll {
          scroll-snap-type: x proximity;
          scroll-padding-left: 0;
          scrollbar-width: thin;
        }
        .board-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .board-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .board-scroll::-webkit-scrollbar-thumb {
          background: #c4c7c7;
        }
        .board-column {
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
