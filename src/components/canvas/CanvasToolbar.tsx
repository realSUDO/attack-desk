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

const TOOLS: ReadonlyArray<{ tool: Tool; label: string; icon: string }> = [
  { tool: "select", label: "Select (V)", icon: "arrow_selector_tool" },
  { tool: "pan", label: "Pan (H)", icon: "pan_tool" },
  { tool: "pen", label: "Pen (P)", icon: "draw" },
  { tool: "rect", label: "Rectangle (R)", icon: "rectangle" },
  { tool: "ellipse", label: "Ellipse (O)", icon: "circle" },
  { tool: "arrow", label: "Arrow (A)", icon: "arrow_forward" },
  { tool: "text", label: "Text (T)", icon: "title" },
  { tool: "eraser", label: "Eraser (E)", icon: "ink_eraser" },
];

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
      <div className="flex items-center gap-xs">
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
          {tool === "select"
            ? "V"
            : tool === "pan"
              ? "H"
              : tool === "pen"
                ? "P"
                : tool === "rect"
                  ? "R"
                  : tool === "ellipse"
                    ? "O"
                    : tool === "arrow"
                      ? "A"
                      : tool === "text"
                        ? "T"
                        : "E"}
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
