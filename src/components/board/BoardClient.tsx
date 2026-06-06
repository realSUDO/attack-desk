"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import { MissionCard, type BoardMission } from "./MissionCard";
import { MissionDrawer } from "./MissionDrawer";

type Column = {
  status: BoardMission["status"];
  title: string;
  count: number;
  tone: "active" | "muted";
  missions: ReadonlyArray<BoardMission>;
};

type Props = {
  columns: ReadonlyArray<Column>;
};

export function BoardClient({ columns }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    columns.flatMap((c) => c.missions).find((m) => m.id === selectedId) ?? null;

  return (
    <>
      <section className="bg-background flex-1 overflow-x-auto p-lg">
        <div className="flex h-full min-w-max gap-lg">
          {columns.map((col) => (
            <div key={col.status} className="flex w-80 flex-col gap-md">
              <div className="border-outline-variant flex items-center justify-between border-b pb-sm">
                <span className="mono-label font-label-md text-on-surface">
                  {col.title} ({String(col.count).padStart(2, "0")})
                </span>
                {col.status !== "DONE" && (
                  <button
                    type="button"
                    aria-label={`Add ${col.title} mission`}
                    className="cursor-pointer"
                  >
                    <MaterialIcon name="add" size={18} />
                  </button>
                )}
              </div>
              <div className="board-column flex flex-col gap-sm">
                {col.missions.length === 0 ? (
                  <div className="border-outline-variant flex h-24 items-center justify-center border border-dashed text-[12px] text-on-surface-variant">
                    No missions.
                  </div>
                ) : (
                  col.missions.map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={m}
                      onSelect={setSelectedId}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <MissionDrawer mission={selected} onClose={() => setSelectedId(null)} />

      <style jsx global>{`
        .board-column {
          min-height: calc(100vh - 160px);
        }
        .mono-label {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          text-transform: uppercase;
        }
        .mission-card:hover {
          border-color: var(--color-primary);
        }
      `}</style>
    </>
  );
}
