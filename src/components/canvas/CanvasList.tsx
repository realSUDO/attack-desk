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
  const [pending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;
    const fd = new FormData();
    fd.set("title", title.trim());
    startTransition(async () => {
      const result = await createCanvasAction(fd);
      if (result.success && result.data?.id) {
        setTitle("");
        setIsCreating(false);
        router.push(`/canvas/${result.data.id}`);
      }
    });
  };

  return (
    <div className="bg-background flex h-full w-full flex-col overflow-auto">
      <div className="border-outline-variant border-b px-lg py-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg">Canvases</h1>
            <p className="text-on-surface-variant font-metadata text-metadata mt-xs">
              Free-form workspaces for plans, sketches, and linkouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-primary text-on-primary font-label-md flex items-center gap-xs px-md py-sm uppercase"
          >
            <MaterialIcon name="add" size={16} />
            New Canvas
          </button>
        </div>
        {isCreating && (
          <div className="border-outline-variant bg-surface mt-md flex items-center gap-sm border p-sm">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setIsCreating(false);
                  setTitle("");
                }
              }}
              placeholder="Canvas title…"
              className="font-body-md border-outline focus:border-primary flex-1 border bg-transparent p-sm focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={pending || !title.trim()}
              className="bg-primary text-on-primary font-label-md px-md py-sm uppercase disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setTitle("");
              }}
              className="text-on-surface-variant hover:text-primary font-label-md px-md py-sm uppercase"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {canvases.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <MaterialIcon
              name="auto_fix_high"
              size={48}
              className="text-on-surface-variant mx-auto"
            />
            <p className="text-on-surface-variant font-body-md mt-md">
              No canvases yet. Create your first one.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md p-lg md:grid-cols-2 lg:grid-cols-3">
          {canvases.map((c) => (
            <Link
              key={c.id}
              href={`/canvas/${c.id}`}
              className="border-outline-variant bg-surface hover:border-primary group block border p-md transition-colors"
            >
              <div className="mb-sm flex items-start justify-between">
                <h3 className="font-headline-md text-headline-md font-bold">
                  {c.title}
                </h3>
                <MaterialIcon
                  name="arrow_forward"
                  size={18}
                  className="text-on-surface-variant group-hover:text-primary"
                />
              </div>
              {c.description && (
                <p className="text-on-surface-variant font-body-md mb-md line-clamp-2">
                  {c.description}
                </p>
              )}
              <div className="text-on-surface-variant font-metadata text-metadata flex items-center gap-md">
                {c.missionCount > 0 && (
                  <span className="flex items-center gap-xs">
                    <MaterialIcon name="assignment" size={14} />
                    {c.missionCount} mission{c.missionCount !== 1 ? "s" : ""}
                  </span>
                )}
                {c.postIdeaCount > 0 && (
                  <span className="flex items-center gap-xs">
                    <MaterialIcon name="edit_note" size={14} />
                    {c.postIdeaCount} idea{c.postIdeaCount !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="ml-auto">{formatRelative(c.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
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
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
