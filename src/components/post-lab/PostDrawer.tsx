"use client";

import { useEffect, useState, useTransition } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import type { BoardPost } from "./PostCard";
import { POST_CATEGORIES } from "./PostCard";

type Props = {
  post: BoardPost | null;
  mode: "create" | "edit";
  onClose: () => void;
};

function wordCount(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function readTime(words: number): string {
  if (words === 0) return "0m";
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins}m`;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PostDrawer({ post, mode, onClose }: Props) {
  const [title, setTitle] = useState(() =>
    mode === "create" ? "" : (post?.title ?? ""),
  );
  const [hook, setHook] = useState(() =>
    mode === "create" ? "" : (post?.hook ?? ""),
  );
  const [draft, setDraft] = useState(() =>
    mode === "create" ? "" : (post?.draft ?? ""),
  );
  const [status, setStatus] = useState<"IDEA" | "DRAFTING" | "READY" | "POSTED">(
    () => (mode === "create" ? "IDEA" : (post?.status ?? "IDEA")),
  );
  const [category, setCategory] = useState(() =>
    mode === "create" ? "" : (post?.category ?? ""),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = post !== null || mode === "create";
  const words = wordCount(draft);
  const minutes = readTime(words);
  const lastEdited = post ? relativeTime(post.updatedAt) : "just now";

  const handleDiscard = () => {
    if (mode === "create" || !post) {
      setTitle("");
      setHook("");
      setDraft("");
      setStatus("IDEA");
      setCategory("");
      return;
    }
    setTitle(post.title);
    setHook(post.hook ?? "");
    setDraft(post.draft ?? "");
    setStatus(post.status);
    setCategory(post.category ?? "");
  };

  const handleSave = () => {
    startTransition(() => {
      // The actual save wiring (createPostAction / updatePostAction) is owned
      // by the existing backend; this stub will be replaced once the form
      // post pipeline is migrated onto the new editor.
      onClose();
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-300 ${
        open ? "visible" : "invisible"
      }`}
      aria-hidden={!open}
    >
      <div
        className="drawer-overlay absolute inset-0"
        onClick={onClose}
        style={{ opacity: open ? 1 : 0 }}
      />
      <div
        className={`bg-background border-outline-variant absolute top-0 right-0 bottom-0 flex w-full md:w-[640px] flex-col border-l transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="border-outline-variant flex h-16 items-center justify-between border-b px-lg">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="edit_note" size={20} className="text-on-surface-variant" />
            <span className="mono-label font-label-md">
              {mode === "create" ? "NEW DRAFT" : "DRAFT EDITOR"}
            </span>
          </div>
          <div className="flex items-center gap-md">
            <button
              type="button"
              onClick={handleDiscard}
              className="font-label-md text-on-surface-variant hover:text-primary transition-colors"
              disabled={isPending}
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || title.trim().length === 0}
              className="bg-primary text-on-primary px-lg py-sm font-label-md hover:opacity-90 active:scale-95 uppercase transition-all disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save Draft"}
            </button>
          </div>
        </header>

        {/* Body: editor + metadata panel */}
        <div className="flex flex-1 overflow-y-auto">
          {/* Writing Area */}
          <div className="border-outline-variant flex-1 border-r p-lg">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              className="font-headline-lg text-headline-lg placeholder:text-outline-variant mb-lg w-full bg-transparent border-none focus:ring-0 focus:outline-hidden p-0"
            />

            <div className="mb-xl">
              <label className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                The Hook
              </label>
              <textarea
                rows={3}
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Write a compelling hook..."
                className="font-body-lg text-body-lg w-full resize-none bg-transparent border-none focus:ring-0 focus:outline-hidden p-0"
              />
            </div>

            <div className="mb-xl">
              <label className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Content Body
              </label>
              <textarea
                rows={15}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Start writing..."
                className="font-body-md text-body-md w-full resize-none bg-transparent border-none focus:ring-0 focus:outline-hidden p-0"
              />
            </div>
          </div>

          {/* Metadata Panel */}
          <aside className="bg-surface-container-low flex w-64 flex-col gap-xl p-lg">
            <div>
              <label className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "IDEA" | "DRAFTING" | "READY" | "POSTED",
                  )
                }
                className="bg-surface border-outline-variant font-label-md focus:border-primary w-full border p-sm focus:outline-hidden"
              >
                <option value="IDEA">Ideas</option>
                <option value="DRAFTING">Drafting</option>
                <option value="READY">Ready</option>
                <option value="POSTED">Posted</option>
              </select>
            </div>

            <div>
              <label className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-surface border-outline-variant font-label-md focus:border-primary w-full border p-sm focus:outline-hidden"
              >
                <option value="">—</option>
                {POST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-outline-variant mt-auto border-t pt-lg">
              <h4 className="font-label-sm text-on-surface-variant mb-md uppercase">
                Details
              </h4>
              <div className="flex flex-col gap-sm">
                <div className="flex items-center justify-between">
                  <span className="font-metadata text-metadata text-on-surface-variant">
                    Last Edited
                  </span>
                  <span className="font-metadata text-metadata">{lastEdited}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-metadata text-metadata text-on-surface-variant">
                    Word Count
                  </span>
                  <span className="font-metadata text-metadata">{words}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-metadata text-metadata text-on-surface-variant">
                    Read Time
                  </span>
                  <span className="font-metadata text-metadata">{minutes}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .drawer-overlay {
          background-color: rgba(30, 27, 21, 0.2);
          backdrop-filter: blur(2px);
        }
      `}</style>
    </div>
  );
}
