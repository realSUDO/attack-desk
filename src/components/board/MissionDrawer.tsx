"use client";

import { useEffect } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import type { BoardMission } from "./MissionCard";

type Props = {
  mission: BoardMission | null;
  onClose: () => void;
};

function formatLongDate(due: Date | null): string {
  if (!due) return "—";
  return due.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function MissionDrawer({ mission, onClose }: Props) {
  useEffect(() => {
    if (!mission) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mission, onClose]);

  const open = mission !== null;

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
        className={`bg-background border-outline-variant absolute top-0 right-0 bottom-0 flex w-[450px] max-w-full flex-col border-l shadow-none p-0 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="border-outline-variant bg-surface-container flex items-center justify-between border-b p-lg">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="assignment" size={20} className="text-on-surface-variant" />
            <span className="mono-label font-label-md">MISSION DETAIL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="hover:text-error transition-colors"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        {mission && (
          <div className="flex flex-1 flex-col gap-xl overflow-y-auto p-lg">
            <div className="flex flex-col gap-md">
              <div className="flex items-center gap-sm">
                <span className="mono-label bg-primary text-on-primary px-sm py-0.5 text-xs">
                  PRIORITY: {mission.priority}
                </span>
                <span className="mono-label border-outline-variant border px-sm py-0.5 text-xs">
                  STATUS: {mission.status}
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg font-bold">
                {mission.title}
              </h2>
              <p className="font-body-md text-on-surface-variant">
                {mission.description ??
                  "No description provided for this mission yet."}
              </p>
            </div>

            <div className="border-outline-variant grid grid-cols-2 gap-lg border-t pt-lg">
              <div className="flex flex-col gap-xs">
                <span className="mono-label text-on-surface-variant text-[10px]">
                  DEADLINE
                </span>
                <div className="flex items-center gap-xs">
                  <MaterialIcon name="event" size={18} />
                  <span className="font-label-md">
                    {formatLongDate(mission.dueDate)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="mono-label text-on-surface-variant text-[10px]">
                  CATEGORY
                </span>
                <div className="flex items-center gap-xs">
                  <MaterialIcon name="category" size={18} />
                  <span className="font-label-md">
                    {mission.category ?? "Uncategorized"}
                  </span>
                </div>
              </div>
            </div>

            {(mission.deadline || mission.canvas) && (
              <div className="border-outline-variant flex flex-col gap-md border-t pt-lg">
                <span className="mono-label text-on-surface-variant text-[10px]">
                  LINKED ASSETS
                </span>
                <div className="flex flex-col gap-sm">
                  {mission.canvas && (
                    <a
                      href="/canvas"
                      className="border-outline-variant hover:border-primary group flex items-center justify-between p-md border transition-all"
                    >
                      <div className="flex items-center gap-md">
                        <MaterialIcon
                          name="auto_fix_high"
                          size={20}
                          className="text-primary group-hover:scale-110 transition-transform"
                        />
                        <div className="flex flex-col">
                          <span className="font-label-md font-bold">
                            {mission.canvas.title}
                          </span>
                          <span className="text-on-surface-variant font-metadata text-[11px] uppercase tracking-tighter">
                            View in Canvas Workspace
                          </span>
                        </div>
                      </div>
                      <MaterialIcon name="arrow_forward" size={18} />
                    </a>
                  )}
                  {mission.deadline && (
                    <a
                      href="#"
                      className="border-outline-variant hover:border-primary group flex items-center justify-between p-md border transition-all"
                    >
                      <div className="flex items-center gap-md">
                        <MaterialIcon
                          name="event"
                          size={20}
                          className="text-on-surface-variant"
                        />
                        <div className="flex flex-col">
                          <span className="font-label-md font-bold">
                            {mission.deadline.title}
                          </span>
                          <span className="text-on-surface-variant font-metadata text-[11px] uppercase tracking-tighter">
                            Linked Deadline
                          </span>
                        </div>
                      </div>
                      <MaterialIcon name="open_in_new" size={18} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {mission && (
          <div className="border-outline-variant bg-surface-container-low flex gap-md border-t p-lg">
            <button
              type="button"
              className="bg-primary text-on-primary font-label-md hover:opacity-90 active:scale-95 flex-1 py-sm uppercase tracking-widest transition-all"
            >
              {mission.status === "DOING"
                ? "Complete Mission"
                : mission.status === "DONE"
                  ? "Reopen Mission"
                  : "Start Mission"}
            </button>
            <button
              type="button"
              aria-label="Delete mission"
              className="border-outline-variant hover:bg-surface-container-highest border px-md transition-colors"
            >
              <MaterialIcon name="delete" size={20} />
            </button>
          </div>
        )}
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
