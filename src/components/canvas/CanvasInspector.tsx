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
  selection: ReadonlyArray<Shape>;
  onUpdateSelected: (patch: Partial<Shape>) => void;
  onDeleteSelected: () => void;
  linkedMissions: ReadonlyArray<{ id: string; title: string }>;
  linkedDeadlines: ReadonlyArray<{ id: string; title: string }>;
  lastSavedAt: Date | null;
  isDeleting: boolean;
  onDeleteCanvas: () => void;
  onOpenLinkModal: () => void;
  onUnlinkMission: (missionId: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
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
  selection,
  onUpdateSelected,
  onDeleteSelected,
  linkedMissions,
  linkedDeadlines,
  lastSavedAt,
  isDeleting,
  onDeleteCanvas,
  onOpenLinkModal,
  onUnlinkMission,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onGroup,
  onUngroup,
  onDuplicate,
}: Props) {
  const single = selection.length === 1 ? selection[0]! : null;
  const multi = selection.length > 1;
  const any = selection.length > 0;
  const allSameStroke = selection.every((s) => s.stroke === selection[0]?.stroke);
  const allSameFill = selection.every((s) => s.fill === selection[0]?.fill);
  const allSameFillPattern = selection.every(
    (s) => s.fillPattern === selection[0]?.fillPattern,
  );
  const allSameStrokeWidth = selection.every(
    (s) => s.strokeWidth === selection[0]?.strokeWidth,
  );

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

      {any && (
        <div className="border-outline-variant p-lg border-b">
          <div className="mb-md flex items-center justify-between">
            <span className="font-label-sm text-on-surface-variant uppercase">
              {multi
                ? `${selection.length} selected`
                : (single?.type ?? "shape")}
            </span>
            <div className="flex items-center gap-xs">
              <button
                type="button"
                onClick={onDuplicate}
                title="Duplicate (⌘D)"
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                <MaterialIcon name="content_copy" size={16} />
              </button>
              <button
                type="button"
                onClick={onDeleteSelected}
                title="Delete shapes (⌫)"
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <MaterialIcon name="delete" size={18} />
              </button>
            </div>
          </div>

          {/* Order / Group operations */}
          {single && (
            <div className="mb-md">
              <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Order
              </span>
              <div className="grid grid-cols-4 gap-sm">
                <OrderButton
                  icon="flip_to_front"
                  label="Front"
                  onClick={() => onBringToFront(single.id)}
                />
                <OrderButton
                  icon="arrow_upward"
                  label="Forward"
                  onClick={() => onBringForward(single.id)}
                />
                <OrderButton
                  icon="arrow_downward"
                  label="Backward"
                  onClick={() => onSendBackward(single.id)}
                />
                <OrderButton
                  icon="flip_to_back"
                  label="Back"
                  onClick={() => onSendToBack(single.id)}
                />
              </div>
            </div>
          )}

          {selection.length >= 2 && (
            <div className="mb-md flex gap-sm">
              <button
                type="button"
                onClick={onGroup}
                className="border-outline-variant hover:bg-surface-container-highest flex flex-1 items-center justify-center gap-xs border py-sm text-[11px] uppercase"
              >
                <MaterialIcon name="group_work" size={14} />
                Group
              </button>
              <button
                type="button"
                onClick={onUngroup}
                disabled={!single?.groupId}
                className="border-outline-variant hover:bg-surface-container-highest flex flex-1 items-center justify-center gap-xs border py-sm text-[11px] uppercase disabled:opacity-30"
              >
                <MaterialIcon name="group_off" size={14} />
                Ungroup
              </button>
            </div>
          )}

          {/* Stroke */}
          {(single?.type === "rect" ||
            single?.type === "ellipse" ||
            single?.type === "pen" ||
            single?.type === "arrow" ||
            multi) && (
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
                      allSameStroke && single?.stroke === color
                        ? "border-primary outline outline-2 outline-primary"
                        : "border-outline"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fill */}
          {(single?.type === "rect" || single?.type === "ellipse" || multi) && (
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
                        allSameFill && single?.fill === color
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
                    const active = allSameFillPattern && single?.fillPattern === p;
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
            </>
          )}

          {/* Stroke width — applies to rect/ellipse/pen/arrow/multi */}
          {(single?.type === "rect" ||
            single?.type === "ellipse" ||
            single?.type === "pen" ||
            single?.type === "arrow" ||
            multi) && (
            <div className="mb-md">
              <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Stroke Width
              </span>
              <input
                type="range"
                min={1}
                max={12}
                value={allSameStrokeWidth ? single?.strokeWidth ?? 2 : 2}
                onChange={(e) =>
                  onUpdateSelected({ strokeWidth: Number(e.target.value) })
                }
                className="w-full"
              />
              <span className="font-metadata text-metadata text-on-surface-variant block text-center">
                {allSameStrokeWidth ? `${single?.strokeWidth}px` : "Mixed"}
              </span>
            </div>
          )}

          {/* Pen size — pen only */}
          {single?.type === "pen" && (
            <div className="mb-md">
              <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                Pen Size
              </span>
              <input
                type="range"
                min={1}
                max={24}
                value={single.size}
                onChange={(e) =>
                  onUpdateSelected({ size: Number(e.target.value) })
                }
                className="w-full"
              />
              <span className="font-metadata text-metadata text-on-surface-variant block text-center">
                {single.size}px
              </span>
            </div>
          )}

          {/* Text-specific */}
          {single?.type === "text" && (
            <>
              <div className="mb-md">
                <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
                  Text
                </span>
                <textarea
                  value={single.text}
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
                  value={single.fontSize}
                  onChange={(e) =>
                    onUpdateSelected({ fontSize: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <span className="font-metadata text-metadata text-on-surface-variant block text-center">
                  {single.fontSize}px
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

function OrderButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-outline-variant hover:bg-surface-container-highest flex h-9 flex-col items-center justify-center border"
      title={label}
    >
      <MaterialIcon name={icon} size={14} />
    </button>
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
