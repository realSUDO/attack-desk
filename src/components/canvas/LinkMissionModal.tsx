"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import {
  linkMissionToCanvasAction,
} from "@/actions/canvas.actions";

type Mission = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

type Props = {
  canvasId: string;
  open: boolean;
  onClose: () => void;
  missions: ReadonlyArray<Mission>;
};

export function LinkMissionModal({
  canvasId,
  open,
  onClose,
  missions,
}: Props) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = missions.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] visible"
      role="dialog"
      aria-modal="true"
      aria-label="Link mission"
    >
      <div
        className="drawer-overlay absolute inset-0"
        onClick={onClose}
        style={{ opacity: 1 }}
      />
      <div className="bg-background border-outline-variant absolute top-1/2 left-1/2 flex w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col border shadow-none">
        <header className="border-outline-variant flex h-14 items-center justify-between border-b px-lg">
          <div className="flex items-center gap-sm">
            <MaterialIcon
              name="add_link"
              size={20}
              className="text-on-surface-variant"
            />
            <span className="mono-label font-label-md">LINK MISSION</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:text-error transition-colors"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </header>

        <div className="border-outline-variant border-b p-md">
          <div className="border-outline-variant flex items-center gap-sm border bg-surface-container-low px-sm py-xs">
            <MaterialIcon
              name="search"
              size={16}
              className="text-on-surface-variant"
            />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search missions…"
              className="font-body-md placeholder:text-on-surface-variant w-full bg-transparent border-none focus:ring-0 focus:outline-hidden p-0"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-sm">
          {filtered.length === 0 ? (
            <div className="text-on-surface-variant font-metadata px-md py-lg text-center">
              {missions.length === 0
                ? "No missions available to link."
                : "No missions match your search."}
            </div>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await linkMissionToCanvasAction(
                          canvasId,
                          m.id,
                        );
                        if (result.success) onClose();
                      });
                    }}
                    className="hover:bg-surface-container flex w-full items-center justify-between gap-md p-md text-left transition-colors disabled:opacity-50"
                  >
                    <div className="flex flex-col gap-xs">
                      <span className="font-label-md font-bold">
                        {m.title}
                      </span>
                      <span className="font-metadata text-metadata text-on-surface-variant">
                        {m.status} · {m.priority}
                      </span>
                    </div>
                    <MaterialIcon
                      name="arrow_forward"
                      size={18}
                      className="text-on-surface-variant"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-outline-variant bg-surface-container-low flex items-center justify-between gap-md border-t px-lg py-sm">
          <span className="font-metadata text-metadata text-on-surface-variant">
            {filtered.length} of {missions.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-label-md hover:opacity-80"
          >
            Cancel
          </button>
        </footer>
      </div>

      <style jsx global>{`
        .drawer-overlay {
          background-color: rgba(30, 27, 21, 0.2);
          backdrop-filter: blur(2px);
        }
        .mono-label {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
