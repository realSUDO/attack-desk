"use client";

import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import type { BoardPost } from "./PostCard";
import { POST_CATEGORIES } from "./PostCard";

export type PostInput = {
  title: string;
  hook: string | null;
  draft: string | null;
  status: BoardPost["status"];
  category: string | null;
};

type Props = {
  post: BoardPost | null;
  mode: "create" | "edit";
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: PostInput) => void;
  onDelete: () => void;
};

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function PostDrawer({
  post,
  mode,
  error,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [hook, setHook] = useState(post?.hook ?? "");
  const [draft, setDraft] = useState(post?.draft ?? "");
  const [status, setStatus] = useState<BoardPost["status"]>(
    post?.status ?? "IDEA",
  );
  const [category, setCategory] = useState(post?.category ?? "");
  const [width, setWidth] = useState(720);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const open = mode === "create" || post !== null;
  const words = wordCount(draft);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onMove = (event: PointerEvent) => {
      if (!resizeRef.current) return;
      const max = Math.max(480, Math.min(1100, window.innerWidth - 96));
      const next = Math.min(
        max,
        Math.max(480, resizeRef.current.startWidth + resizeRef.current.startX - event.clientX),
      );
      setWidth(next);
    };
    const onUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.localStorage.setItem("post-drawer-width", String(width));
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [onClose, open, width]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-200 ${
        open ? "visible" : "invisible"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close draft editor"
        className="drawer-overlay absolute inset-0"
        onClick={onClose}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            title: title.trim(),
            hook: hook.trim() || null,
            draft: draft.trim() || null,
            status,
            category: category || null,
          });
        }}
        style={{ width: `min(${width}px, calc(100vw - 24px))` }}
        className={`bg-background border-outline-variant absolute top-0 right-0 bottom-0 flex max-w-full flex-col border-l transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label="Resize draft editor"
          title="Drag to resize editor"
          onPointerDown={(event) => {
            event.preventDefault();
            resizeRef.current = { startX: event.clientX, startWidth: width };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="group absolute top-0 bottom-0 left-0 z-10 w-3 -translate-x-1/2 cursor-col-resize touch-none"
        >
          <span className="bg-outline-variant group-hover:bg-primary absolute top-0 bottom-0 left-1/2 w-px transition-colors" />
        </button>

        <header className="border-outline-variant flex h-16 shrink-0 items-center justify-between border-b px-lg">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="edit_note" size={20} />
            <span className="mono-label font-label-md">
              {mode === "create" ? "NEW DRAFT" : "DRAFT EDITOR"}
            </span>
          </div>
          <div className="flex items-center gap-md">
            {mode === "edit" && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving}
                className="text-error disabled:opacity-40"
                aria-label="Delete post"
              >
                <MaterialIcon name="delete" size={20} />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close editor">
              <MaterialIcon name="close" size={20} />
            </button>
            <button
              type="submit"
              disabled={isSaving || title.trim().length === 0}
              className="bg-primary text-on-primary px-lg py-sm font-label-md uppercase disabled:opacity-40"
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="border-outline-variant min-w-0 flex-1 overflow-y-auto border-r p-lg">
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Post title"
              className="font-headline-lg text-headline-lg mb-lg w-full border-none bg-transparent p-0 outline-none"
            />
            <label className="font-label-sm text-on-surface-variant mb-sm block uppercase">
              The Hook
            </label>
            <textarea
              rows={4}
              value={hook}
              onChange={(event) => setHook(event.target.value)}
              placeholder="Write a compelling hook..."
              className="font-body-lg mb-xl w-full resize-y border-none bg-transparent p-0 outline-none"
            />
            <label className="font-label-sm text-on-surface-variant mb-sm block uppercase">
              Content Body
            </label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Start writing..."
              className="font-body-md min-h-[420px] w-full resize-none border-none bg-transparent p-0 outline-none"
            />
          </div>

          <aside className="bg-surface-container-low flex w-56 shrink-0 flex-col gap-xl overflow-y-auto p-lg max-sm:hidden">
            <label className="flex flex-col gap-sm">
              <span className="font-label-sm text-on-surface-variant uppercase">
                Status
              </span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as BoardPost["status"])
                }
                className="border-outline-variant bg-surface border p-sm"
              >
                <option value="IDEA">Idea</option>
                <option value="DRAFTING">Drafting</option>
                <option value="READY">Ready</option>
                <option value="POSTED">Posted</option>
              </select>
            </label>
            <label className="flex flex-col gap-sm">
              <span className="font-label-sm text-on-surface-variant uppercase">
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="border-outline-variant bg-surface border p-sm"
              >
                <option value="">Uncategorized</option>
                {POST_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <div className="border-outline-variant mt-auto border-t pt-lg text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Words</span>
                <span>{words}</span>
              </div>
              <div className="mt-sm flex justify-between">
                <span className="text-on-surface-variant">Read time</span>
                <span>{words ? Math.max(1, Math.ceil(words / 220)) : 0}m</span>
              </div>
            </div>
          </aside>
        </div>
        {error && (
          <p role="alert" className="border-error text-error border-t p-sm text-sm">
            {error}
          </p>
        )}
      </form>
      <style jsx global>{`
        .drawer-overlay {
          background: rgba(30, 27, 21, 0.2);
          backdrop-filter: blur(2px);
        }
      `}</style>
    </div>
  );
}
