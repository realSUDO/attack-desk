"use client";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import { TOOLS, type Tool } from "./types";

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
    <header className="bg-surface border-outline-variant z-40 flex h-16 items-center justify-between border-b px-lg">
      <div className="flex items-center gap-md">
        <div className="border-outline-variant flex border">
          {TOOLS.map((t, idx) => {
            const active = tool === t.id;
            const isLast = idx === TOOLS.length - 1;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTool(t.id)}
                title={`${t.label} (${t.hint})`}
                aria-label={t.label}
                className={`flex h-10 w-10 items-center justify-center transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "hover:bg-surface-container-highest"
                } ${idx > 0 && !isLast ? "border-outline-variant border-r" : ""} ${
                  isLast ? "" : ""
                }`}
              >
                <MaterialIcon name={t.icon} size={18} filled={active && t.id === "select"} />
              </button>
            );
          })}
        </div>
        <div className="bg-outline-variant mx-xs h-6 w-px" />
        <div className="border-outline-variant flex border">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
            className="hover:bg-surface-container-highest border-outline-variant flex h-10 w-10 items-center justify-center border-r transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            <MaterialIcon name="undo" size={18} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
            className="hover:bg-surface-container-highest flex h-10 w-10 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            <MaterialIcon name="redo" size={18} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-md">
        <span
          className={`font-metadata text-metadata uppercase tracking-wider ${
            isDirty ? "text-on-surface-variant" : "text-secondary"
          }`}
        >
          {isSaving ? "Saving…" : isDirty ? "Unsaved" : "Saved"}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary text-on-primary font-label-md hover:opacity-90 active:scale-95 flex items-center gap-xs px-md py-sm uppercase tracking-wider transition-transform disabled:opacity-50"
        >
          <MaterialIcon name="save" size={18} />
          Save
        </button>
      </div>
    </header>
  );
}
