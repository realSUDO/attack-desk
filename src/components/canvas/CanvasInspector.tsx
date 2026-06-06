"use client";

import Link from "next/link";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import {
  FILL_OPTIONS,
  FILL_PATTERNS,
  STROKE_OPTIONS,
  type FillPattern,
  type Shape,
  type TextAlign,
  type Tool,
  type ToolDefaults,
} from "./types";

type Props = {
  canvasTitle: string;
  onTitleChange: (v: string) => void;
  tool: Tool;
  selection: ReadonlyArray<Shape>;
  toolDefaults: ToolDefaults;
  onUpdateToolDefaults: (patch: Partial<ToolDefaults>) => void;
  onUpdateSelected: (patch: Partial<Shape>) => void;
  onUpdateSelectedBatch: (patch: Partial<Shape>) => void;
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

const TOOL_DEFAULT_LABELS: Record<Tool, string> = {
  select: "Defaults",
  pan: "Defaults",
  pen: "Pen Defaults",
  rect: "Rectangle Defaults",
  ellipse: "Ellipse Defaults",
  arrow: "Arrow Defaults",
  text: "Text Defaults",
  eraser: "Defaults",
};

const TOOL_DEFAULT_HINTS: Record<Tool, string> = {
  select: "Pick a draw tool to see its options.",
  pan: "Pick a draw tool to see its options.",
  pen: "Pen draws freehand strokes in the stroke color.",
  rect: "Rectangles support stroke, fill, and patterns.",
  ellipse: "Ellipses support stroke, fill, and patterns.",
  arrow: "Arrows draw with the stroke color and a minimum 2px width.",
  text: "Text uses the stroke color and the size below.",
  eraser: "Click shapes to delete them. No defaults to set.",
};

type Tab = "defaults" | "selection";

const isDrawTool = (t: Tool): boolean =>
  t === "pen" || t === "rect" || t === "ellipse" || t === "arrow" || t === "text";

export function CanvasInspector({
  canvasTitle,
  onTitleChange,
  tool,
  selection,
  toolDefaults,
  onUpdateToolDefaults,
  onUpdateSelected,
  onUpdateSelectedBatch,
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
  // Tab is derived from context: draw tools always show Defaults; otherwise
  // show Selection when something is selected.
  const activeTab: Tab = isDrawTool(tool) || !any ? "defaults" : "selection";
  const showSelectionTab = !isDrawTool(tool);

  const allSameStroke = selection.every((s) => s.stroke === selection[0]?.stroke);
  const allSameFill = selection.every((s) => s.fill === selection[0]?.fill);
  const allSameFillPattern = selection.every(
    (s) => s.fillPattern === selection[0]?.fillPattern,
  );
  const allSameStrokeWidth = selection.every(
    (s) => s.strokeWidth === selection[0]?.strokeWidth,
  );

  return (
    <aside className="border-outline-variant bg-surface z-30 flex w-80 flex-col border-l">
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

      <div className="border-outline-variant flex border-b">
        <TabButton
          label={TOOL_DEFAULT_LABELS[tool]}
          active={activeTab === "defaults"}
        />
        {showSelectionTab && (
          <TabButton
            label={any ? (multi ? `Selection (${selection.length})` : "Selection") : "Selection"}
            active={activeTab === "selection"}
            disabled={!any}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "defaults" && (
          <ToolDefaultsPanel
            tool={tool}
            toolDefaults={toolDefaults}
            onUpdateToolDefaults={onUpdateToolDefaults}
          />
        )}

        {activeTab === "selection" && any && (
          <SelectionPanel
            selection={selection}
            single={single}
            multi={multi}
            allSameStroke={allSameStroke}
            allSameFill={allSameFill}
            allSameFillPattern={allSameFillPattern}
            allSameStrokeWidth={allSameStrokeWidth}
            onUpdateSelected={onUpdateSelected}
            onUpdateSelectedBatch={onUpdateSelectedBatch}
            onDeleteSelected={onDeleteSelected}
            onDuplicate={onDuplicate}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onGroup={onGroup}
            onUngroup={onUngroup}
          />
        )}

        {activeTab === "selection" && !any && (
          <div className="text-on-surface-variant font-body-md p-lg text-center">
            Select a shape to edit its properties.
          </div>
        )}
      </div>

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

function TabButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`font-label-sm flex-1 border-b-2 px-md py-sm uppercase transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-on-surface-variant hover:text-primary"
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-on-surface-variant`}
    >
      {label}
    </button>
  );
}

function SelectionPanel({
  selection,
  single,
  multi,
  allSameStroke,
  allSameFill,
  allSameFillPattern,
  allSameStrokeWidth,
  onUpdateSelected,
  onUpdateSelectedBatch,
  onDeleteSelected,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onGroup,
  onUngroup,
}: {
  selection: ReadonlyArray<Shape>;
  single: Shape | null;
  multi: boolean;
  allSameStroke: boolean;
  allSameFill: boolean;
  allSameFillPattern: boolean;
  allSameStrokeWidth: boolean;
  onUpdateSelected: (patch: Partial<Shape>) => void;
  onUpdateSelectedBatch: (patch: Partial<Shape>) => void;
  onDeleteSelected: () => void;
  onDuplicate: () => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
}) {
  const batch = multi;
  const onChange = batch ? onUpdateSelectedBatch : onUpdateSelected;

  const types = new Set(selection.map((s) => s.type));
  const allFillable = [...types].every((t) => t === "rect" || t === "ellipse");
  const allArrowLike = [...types].every(
    (t) => t === "rect" || t === "ellipse" || t === "arrow",
  );

  const hasFill = single?.type === "rect" || single?.type === "ellipse" || (multi && allFillable);
  const hasPattern = hasFill;
  const hasStrokeWidth =
    single?.type === "rect" ||
    single?.type === "ellipse" ||
    single?.type === "arrow" ||
    (multi && allArrowLike);
  const hasPenSize = !!single && single.type === "pen" && !multi;
  const hasText = !!single && single.type === "text" && !multi;

  const anyOption = hasFill || hasPattern || hasStrokeWidth || hasPenSize || hasText;

  return (
    <div className="border-outline-variant p-lg border-b">
      <div className="mb-md flex items-center justify-between">
        <span className="font-label-sm text-on-surface-variant uppercase">
          {multi ? `${selection.length} selected` : (single?.type ?? "shape")}
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

      {single?.type === "text" && (
        <TextAlignControl
          value={single.align ?? "left"}
          onChange={(align) => onUpdateSelected({ align })}
        />
      )}

      {single && single.type !== "text" && (
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

      {allSameStroke && (single || multi) && selection[0] && (
        <StrokePalette
          value={selection[0].stroke}
          onChange={(c) => onChange({ stroke: c })}
        />
      )}

      {hasFill && (
        <FillPalette
          value={allSameFill && single ? single.fill : null}
          onChange={(c) => onChange({ fill: c })}
        />
      )}

      {hasPattern && (
        <PatternGrid
          value={allSameFillPattern && single ? single.fillPattern : null}
          onChange={(p) => onChange({ fillPattern: p })}
        />
      )}

      {hasStrokeWidth && (
        <Slider
          label="Stroke Width"
          min={1}
          max={12}
          value={allSameStrokeWidth && single ? single.strokeWidth : null}
          onChange={(v) => onChange({ strokeWidth: v })}
        />
      )}

      {hasPenSize && single?.type === "pen" && (
        <Slider
          label="Pen Size"
          min={1}
          max={24}
          value={single.size}
          onChange={(v) => onUpdateSelected({ size: v })}
        />
      )}

      {hasText && single?.type === "text" && (
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
          <Slider
            label="Size"
            min={12}
            max={72}
            value={single.fontSize}
            onChange={(v) => onUpdateSelected({ fontSize: v })}
          />
        </>
      )}

      {!anyOption && !allSameStroke && (
        <div className="text-on-surface-variant font-body-md py-md text-center">
          No editable options for this selection.
        </div>
      )}
    </div>
  );
}

function ToolDefaultsPanel({
  tool,
  toolDefaults,
  onUpdateToolDefaults,
}: {
  tool: Tool;
  toolDefaults: ToolDefaults;
  onUpdateToolDefaults: (patch: Partial<ToolDefaults>) => void;
}) {
  const hasStroke = tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "arrow" || tool === "text";
  const hasFill = tool === "rect" || tool === "ellipse";
  const hasPattern = tool === "rect" || tool === "ellipse";
  const hasStrokeWidth = tool === "rect" || tool === "ellipse" || tool === "arrow";
  const hasPenSize = tool === "pen";
  const hasTextSize = tool === "text";
  const anyOption =
    hasStroke ||
    hasFill ||
    hasPattern ||
    hasStrokeWidth ||
    hasPenSize ||
    hasTextSize;

  return (
    <div className="border-outline-variant p-lg border-b">
      <div className="mb-md flex items-center justify-between">
        <span className="font-label-sm text-on-surface-variant uppercase">
          {TOOL_DEFAULT_LABELS[tool]}
        </span>
        <MaterialIcon name="edit" size={14} className="text-on-surface-variant" />
      </div>
      <p className="font-metadata text-metadata text-on-surface-variant mb-md">
        {TOOL_DEFAULT_HINTS[tool]}
      </p>
      {!anyOption && (
        <div className="text-on-surface-variant font-body-md py-md text-center">
          No defaults for this tool.
        </div>
      )}
      {hasStroke && (
        <StrokePalette
          value={toolDefaults.stroke}
          onChange={(c) => onUpdateToolDefaults({ stroke: c })}
        />
      )}
      {hasFill && (
        <FillPalette
          value={toolDefaults.fill}
          onChange={(c) => onUpdateToolDefaults({ fill: c })}
        />
      )}
      {hasPattern && (
        <PatternGrid
          value={toolDefaults.fillPattern}
          onChange={(p) => onUpdateToolDefaults({ fillPattern: p })}
        />
      )}
      {hasStrokeWidth && (
        <Slider
          label="Stroke Width"
          min={1}
          max={12}
          value={toolDefaults.strokeWidth}
          onChange={(v) => onUpdateToolDefaults({ strokeWidth: v })}
        />
      )}
      {hasPenSize && (
        <Slider
          label="Pen Size"
          min={1}
          max={24}
          value={toolDefaults.penSize}
          onChange={(v) => onUpdateToolDefaults({ penSize: v })}
        />
      )}
      {hasTextSize && (
        <>
          <Slider
            label="Text Size"
            min={12}
            max={72}
            value={toolDefaults.fontSize}
            onChange={(v) => onUpdateToolDefaults({ fontSize: v })}
          />
          <TextAlignControl
            value={toolDefaults.textAlign}
            onChange={(textAlign) => onUpdateToolDefaults({ textAlign })}
          />
        </>
      )}
    </div>
  );
}

function TextAlignControl({
  value,
  onChange,
}: {
  value: TextAlign;
  onChange: (value: TextAlign) => void;
}) {
  const options: ReadonlyArray<{ value: TextAlign; icon: string; label: string }> =
    [
      { value: "left", icon: "format_align_left", label: "Align left" },
      { value: "center", icon: "format_align_center", label: "Align center" },
      { value: "right", icon: "format_align_right", label: "Align right" },
    ];

  return (
    <div className="mb-md">
      <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
        Alignment
      </span>
      <div className="grid grid-cols-3 gap-xs">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex h-9 items-center justify-center border ${
              value === option.value
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant hover:bg-surface-container-highest"
            }`}
          >
            <MaterialIcon name={option.icon} size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

function StrokePalette({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string) => void;
}) {
  return (
    <div className="mb-md">
      <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
        Stroke
      </span>
      <div className="flex flex-wrap gap-sm">
        {STROKE_OPTIONS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Stroke ${color}`}
            className={`h-7 w-7 border ${
              value === color
                ? "border-primary outline outline-2 outline-primary"
                : "border-outline"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

function FillPalette({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string) => void;
}) {
  return (
    <div className="mb-md">
      <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
        Fill
      </span>
      <div className="flex flex-wrap gap-sm">
        {FILL_OPTIONS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Fill ${color}`}
            className={`h-7 w-7 border ${
              value === color
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
  );
}

function PatternGrid({
  value,
  onChange,
}: {
  value: FillPattern | null;
  onChange: (p: FillPattern) => void;
}) {
  return (
    <div className="mb-md">
      <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
        Pattern
      </span>
      <div className="grid grid-cols-5 gap-sm">
        {FILL_PATTERNS.map((p) => {
          const active = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
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
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const display = value ?? Math.round((min + max) / 2);
  return (
    <div className="mb-md">
      <span className="font-label-sm text-on-surface-variant mb-sm block uppercase">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <span className="font-metadata text-metadata text-on-surface-variant block text-center">
        {value === null ? "Mixed" : `${display}px`}
      </span>
    </div>
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
