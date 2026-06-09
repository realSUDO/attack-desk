"use client";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import type { Tool } from "./types";

type Props = {
  tool: Tool;
  onTool: (t: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
};

const TOOLS: ReadonlyArray<{ tool: Tool; label: string; icon: string; key: string }> = [
  { tool: "select", label: "Select (V)", icon: "arrow_selector_tool", key: "V" },
  { tool: "pan", label: "Pan (H)", icon: "pan_tool", key: "H" },
  { tool: "pen", label: "Pen (P)", icon: "draw", key: "P" },
  { tool: "rect", label: "Rectangle (R)", icon: "rectangle", key: "R" },
  { tool: "ellipse", label: "Ellipse (O)", icon: "circle", key: "O" },
  { tool: "arrow", label: "Arrow (A)", icon: "arrow_forward", key: "A" },
  { tool: "text", label: "Text (T)", icon: "title", key: "T" },
  { tool: "eraser", label: "Eraser (E)", icon: "ink_eraser", key: "E" },
];

const TOOL_KEY_LABEL: Record<Tool, string> = TOOLS.reduce(
  (acc, t) => {
    acc[t.tool] = t.key;
    return acc;
  },
  {} as Record<Tool, string>,
);

export function CanvasToolbar({
  tool,
  onTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSaving,
  isDirty,
  onSave,
}: Props) {
  return (
    <header className="border-outline-variant bg-surface flex h-14 items-center justify-between border-b px-md">
      <div className="flex items-center gap-xs overflow-x-auto">
        {TOOLS.map(({ tool: t, label, icon }) => {
          const active = tool === t;
          return (
            <button
              key={t}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onTool(t)}
              className={`flex h-9 w-9 items-center justify-center border ${
                active
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <MaterialIcon name={icon} size={18} filled={active} />
            </button>
          );
        })}
        <span className="font-metadata text-metadata text-on-surface-variant mx-sm hidden lg:inline">
          {TOOL_KEY_LABEL[tool]}
        </span>
      </div>

      <div className="flex items-center gap-sm">
        <button
          type="button"
          title="Undo (⌘Z)"
          aria-label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className="text-on-surface-variant flex h-9 w-9 items-center justify-center hover:text-primary disabled:opacity-30"
        >
          <MaterialIcon name="undo" size={18} />
        </button>
        <button
          type="button"
          title="Redo (⌘⇧Z)"
          aria-label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className="text-on-surface-variant flex h-9 w-9 items-center justify-center hover:text-primary disabled:opacity-30"
        >
          <MaterialIcon name="redo" size={18} />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`font-label-md border px-md py-sm uppercase ${
            isDirty
              ? "border-primary bg-primary text-on-primary"
              : "border-outline-variant text-on-surface-variant"
          } disabled:opacity-50`}
        >
          {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
        </button>
      </div>
    </header>
  );
}
