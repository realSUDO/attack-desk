"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import { createCanvasAction } from "@/actions/canvas.actions";

type CanvasItem = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  missionCount: number;
  postIdeaCount: number;
};

type Props = {
  canvases: ReadonlyArray<CanvasItem>;
};

export function CanvasList({ canvases }: Props) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();
  const [draftTitle, setDraftTitle] = useState("");
  const [showNewRow, setShowNewRow] = useState(false);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-outline-variant flex items-center justify-between border-b px-margin-desktop py-md">
        <div className="flex items-center gap-md">
          <h1 className="font-headline-md text-headline-md text-primary font-bold">
            Canvases
          </h1>
          <div className="bg-outline-variant h-6 w-px" />
          <span className="font-label-md text-on-surface-variant">
            {String(canvases.length).padStart(2, "0")} workspaces
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowNewRow(true)}
          disabled={showNewRow}
          className="bg-primary text-on-primary font-label-md hover:opacity-90 active:scale-95 flex items-center gap-xs px-lg py-sm uppercase tracking-wider transition-transform disabled:opacity-50"
        >
          <MaterialIcon name="add" size={18} />
          New Canvas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-margin-desktop">
        {showNewRow && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const title = draftTitle.trim() || "Untitled Canvas";
              startCreate(async () => {
                const fd = new FormData();
                fd.set("title", title);
                const result = await createCanvasAction(fd);
                if (result.success && result.data?.id) {
                  setDraftTitle("");
                  setShowNewRow(false);
                  router.push(`/canvas/${result.data.id}`);
                }
              });
            }}
            className="border-primary bg-surface-container-low mb-lg flex items-center gap-md border p-md"
          >
            <MaterialIcon
              name="edit_note"
              size={20}
              className="text-primary"
            />
            <input
              type="text"
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Canvas title…"
              className="font-headline-md placeholder:text-on-surface-variant flex-1 border-none bg-transparent focus:ring-0 focus:outline-hidden p-0"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-primary text-on-primary font-label-md px-md py-sm uppercase tracking-wider hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftTitle("");
                setShowNewRow(false);
              }}
              className="text-on-surface-variant hover:text-error px-sm py-sm"
              aria-label="Cancel"
            >
              <MaterialIcon name="close" size={20} />
            </button>
          </form>
        )}

        {canvases.length === 0 ? (
          <div className="border-outline-variant flex flex-col items-center justify-center gap-md border border-dashed p-xl text-center">
            <MaterialIcon
              name="auto_fix_high"
              size={36}
              className="text-on-surface-variant"
            />
            <span className="font-headline-md text-headline-md text-on-surface-variant">
              No canvases yet
            </span>
            <span className="font-body-md text-on-surface-variant max-w-md">
              Click <strong>New Canvas</strong> above to create your first
              workspace for spatial brainstorming and idea mapping.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
            {canvases.map((c) => (
              <Link
                key={c.id}
                href={`/canvas/${c.id}`}
                className="border-outline-variant hover:border-primary group flex flex-col gap-md border bg-surface p-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-md">
                  <h2 className="font-headline-md text-headline-md group-hover:text-primary font-bold">
                    {c.title}
                  </h2>
                  <MaterialIcon
                    name="arrow_forward"
                    size={18}
                    className="text-on-surface-variant group-hover:text-primary shrink-0 transition-colors"
                  />
                </div>
                {c.description && (
                  <p className="font-body-md text-on-surface-variant line-clamp-2">
                    {c.description}
                  </p>
                )}
                <div className="border-outline-variant mt-auto flex items-center justify-between gap-md border-t pt-md">
                  <div className="flex items-center gap-md font-metadata text-metadata text-on-surface-variant">
                    <span className="flex items-center gap-xs">
                      <MaterialIcon name="assignment" size={14} />
                      {c.missionCount}
                    </span>
                    <span className="flex items-center gap-xs">
                      <MaterialIcon name="edit_note" size={14} />
                      {c.postIdeaCount}
                    </span>
                  </div>
                  <span className="font-metadata text-metadata text-on-surface-variant">
                    {formatRelative(c.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
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
