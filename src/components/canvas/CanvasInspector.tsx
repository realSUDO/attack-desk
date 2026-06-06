"use client";

import Link from "next/link";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import {
  FILL_OPTIONS,
  FILL_PATTERNS,
  STROKE_OPTIONS,
  type FillPattern,
  type Shape,
} from "./types";

type Props = {
  canvasTitle: string;
  onTitleChange: (v: string) => void;
  selected: Shape | null;
  onUpdateSelected: (patch: Partial<Shape>) => void;
  onDeleteSelected: () => void;
  linkedMissions: ReadonlyArray<{ id: string; title: string }>;
  linkedDeadlines: ReadonlyArray<{ id: string; title: string }>;
  lastSavedAt: Date | null;
  isDeleting: boolean;
  onDeleteCanvas: () => void;
  onOpenLinkModal: () => void;
  onUnlinkMission: (missionId: string) => void;
};

const FILL_PATTERN_LABELS: Record<FillPattern, string> = {
  none: "None",
  solid: "Solid",
  hachure: "Hachure",
  "cross-hatch": "Cross",
  dots: "Dots",
};

const FILL_PATTERN_ICONS: Record<FillPattern, string> = {
  none: "block",
  solid: "format_color_fill",
  hachure: "texture",
  "cross-hatch": "grid_on",
  dots: "blur_on",
};

export function CanvasInspector({
  canvasTitle,
  onTitleChange,
  selected,
  onUpdateSelected,
  onDeleteSelected,
  linkedMissions,
  linkedDeadlines,
  lastSavedAt,
  isDeleting,
  onDeleteCanvas,
  onOpenLinkModal,
  onUnlinkMission,
}: Props) {
  return (
    <aside className="border-outline-variant bg-surface flex w-80 flex-col border-l z-30">
      <div className="border-outline-variant border-b">
        <Link
          href="/canvas"
          className="text-on-surface-variant hover:text-primary flex items-center gap-xs px-lg py-sm text-[11px] uppercase tracking-wider transition-colors"
        >
          <MaterialIcon name="arrow_back" size={14} />
          All Canvases
        </Link>
      </div>
      <div className="border-outline-variant p-lg border-b">
        <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
          Workspace Identity
        </span>
        <input
          type="text"
          value={canvasTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="font-headline-md text-headline-md focus:border-primary w-full border border-outline bg-transparent p-sm font-bold focus:outline-hidden"
        />
      </div>

      {selected && (
        <div className="border-outline-variant p-lg border-b">
          <div className="mb-md flex items-center justify-between">
            <span className="font-label-sm text-on-surface-variant uppercase">
              {selected.type}
            </span>
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete shape (⌫)"
              className="text-on-surface-variant hover:text-error transition-colors"
            >
              <MaterialIcon name="delete" size={18} />
            </button>
          </div>

          {(selected.type === "rect" ||
            selected.type === "ellipse" ||
            selected.type === "pen" ||
            selected.type === "arrow") && (
            <div className="mb-md">
              <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Stroke
              </span>
              <div className="flex flex-wrap gap-sm">
                {STROKE_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdateSelected({ stroke: color })}
                    aria-label={`Stroke ${color}`}
                    className={`h-7 w-7 border ${
                      selected.stroke === color
                        ? "border-primary outline outline-2 outline-primary"
                        : "border-outline"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {(selected.type === "rect" || selected.type === "ellipse") && (
            <>
              <div className="mb-md">
                <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                  Fill
                </span>
                <div className="flex flex-wrap gap-sm">
                  {FILL_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onUpdateSelected({ fill: color })}
                      aria-label={`Fill ${color}`}
                      className={`h-7 w-7 border ${
                        selected.fill === color
                          ? "border-primary outline outline-2 outline-primary"
                          : "border-outline"
                      }`}
                      style={{
                        backgroundColor: color === "transparent" ? "#ffffff" : color,
                        backgroundImage:
                          color === "transparent"
                            ? "linear-gradient(45deg, #c4c7c7 25%, transparent 25%), linear-gradient(-45deg, #c4c7c7 25%, transparent 25%)"
                            : undefined,
                        backgroundSize: color === "transparent" ? "8px 8px" : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-md">
                <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                  Pattern
                </span>
                <div className="grid grid-cols-5 gap-sm">
                  {FILL_PATTERNS.map((p) => {
                    const active = selected.fillPattern === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onUpdateSelected({ fillPattern: p })}
                        title={FILL_PATTERN_LABELS[p]}
                        className={`flex h-9 items-center justify-center border ${
                          active
                            ? "border-primary text-primary"
                            : "border-outline-variant text-on-surface-variant hover:text-primary"
                        }`}
                      >
                        <MaterialIcon name={FILL_PATTERN_ICONS[p]} size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                  Stroke Width
                </span>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={selected.strokeWidth}
                  onChange={(e) =>
                    onUpdateSelected({ strokeWidth: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <span className="font-metadata text-metadata text-on-surface-variant block text-center">
                  {selected.strokeWidth}px
                </span>
              </div>
            </>
          )}

          {(selected.type === "pen" || selected.type === "arrow") && (
            <div>
              <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Stroke Width
              </span>
              <input
                type="range"
                min={1}
                max={12}
                value={selected.strokeWidth}
                onChange={(e) =>
                  onUpdateSelected({ strokeWidth: Number(e.target.value) })
                }
                className="w-full"
              />
              <span className="font-metadata text-metadata text-on-surface-variant block text-center">
                {selected.strokeWidth}px
              </span>
            </div>
          )}

          {selected.type === "text" && (
            <>
              <div className="mb-md">
                <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                  Text
                </span>
                <textarea
                  value={selected.text}
                  onChange={(e) => onUpdateSelected({ text: e.target.value })}
                  rows={3}
                  className="font-body-md border-outline focus:border-primary w-full border bg-transparent p-sm focus:outline-hidden"
                />
              </div>
              <div>
                <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                  Size
                </span>
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={selected.fontSize}
                  onChange={(e) =>
                    onUpdateSelected({ fontSize: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <span className="font-metadata text-metadata text-on-surface-variant block text-center">
                  {selected.fontSize}px
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="border-outline-variant p-lg border-b">
        <span className="font-label-sm text-on-surface-variant mb-md block uppercase">
          Linked Items
        </span>
        <div className="flex flex-col gap-sm">
          {linkedMissions.length === 0 && linkedDeadlines.length === 0 ? (
            <span className="font-metadata text-on-surface-variant text-[11px]">
              No linked missions or deadlines yet.
            </span>
          ) : (
            <>
              {linkedMissions.map((m) => (
                <div
                  key={m.id}
                  className="border-outline-variant bg-surface-container flex items-center justify-between border p-sm"
                >
                  <div className="flex items-center gap-sm">
                    <MaterialIcon
                      name="assignment"
                      size={16}
                      className="text-secondary"
                    />
                    <span className="font-label-md">Mission: {m.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnlinkMission(m.id)}
                    aria-label={`Unlink ${m.title}`}
                    className="text-on-surface-variant hover:text-error transition-colors"
                  >
                    <MaterialIcon name="close" size={18} />
                  </button>
                </div>
              ))}
              {linkedDeadlines.map((d) => (
                <div
                  key={d.id}
                  className="border-outline-variant bg-surface-container flex items-center justify-between border p-sm"
                >
                  <div className="flex items-center gap-sm">
                    <MaterialIcon
                      name="event_busy"
                      size={16}
                      className="text-error"
                    />
                    <span className="font-label-md">Deadline: {d.title}</span>
                  </div>
                  <MaterialIcon
                    name="close"
                    size={18}
                    className="text-on-surface-variant"
                  />
                </div>
              ))}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenLinkModal}
          className="border-outline text-on-surface-variant font-label-sm hover:bg-surface-container-highest mt-md w-full border border-dashed py-sm uppercase transition-colors"
        >
          + Link Mission
        </button>
      </div>

      <div className="bg-surface-container-low border-outline-variant mt-auto space-y-md border-t p-lg">
        <div className="text-on-surface-variant flex items-center justify-between font-metadata text-metadata">
          <span>Last Saved</span>
          <span className="font-bold">
            {lastSavedAt ? formatRelative(lastSavedAt) : "Never"}
          </span>
        </div>
        <button
          type="button"
          onClick={onDeleteCanvas}
          disabled={isDeleting}
          className="bg-error text-on-error font-label-md active:opacity-90 w-full uppercase tracking-widest py-md disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete Canvas"}
        </button>
      </div>
    </aside>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
