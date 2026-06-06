"use client";

import { useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

import type { BoardMission } from "./MissionCard";

export type MissionInput = {
  title: string;
  description: string | null;
  status: BoardMission["status"];
  priority: BoardMission["priority"];
  category: string | null;
  dueDate: string | null;
};

type Props = {
  mission: BoardMission | null;
  mode: "create" | "edit";
  initialStatus?: BoardMission["status"];
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: MissionInput) => void;
  onDelete: () => void;
};

function dateInputValue(date: Date | null): string {
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function MissionDrawer({
  mission,
  mode,
  initialStatus = "PLANNED",
  error,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(mission?.title ?? "");
  const [description, setDescription] = useState(mission?.description ?? "");
  const [status, setStatus] = useState<BoardMission["status"]>(
    mission?.status ?? initialStatus,
  );
  const [priority, setPriority] = useState<BoardMission["priority"]>(
    mission?.priority ?? "MEDIUM",
  );
  const [category, setCategory] = useState(mission?.category ?? "");
  const [dueDate, setDueDate] = useState(dateInputValue(mission?.dueDate ?? null));
  const open = mode === "create" || mission !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-200 ${
        open ? "visible" : "invisible"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close mission editor"
        className="drawer-overlay absolute inset-0"
        onClick={onClose}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            category: category.trim() || null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          });
        }}
        className={`bg-background border-outline-variant absolute top-0 right-0 bottom-0 flex w-[480px] max-w-full flex-col border-l transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="border-outline-variant bg-surface-container flex h-16 items-center justify-between border-b px-lg">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="assignment" size={20} />
            <span className="mono-label font-label-md">
              {mode === "create" ? "NEW MISSION" : "EDIT MISSION"}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <MaterialIcon name="close" size={20} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-lg overflow-y-auto p-lg">
          <Field label="Title">
            <input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mission-input"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mission-input resize-y"
            />
          </Field>
          <div className="grid grid-cols-2 gap-md">
            <Field label="Status">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as BoardMission["status"])
                }
                className="mission-input"
              >
                <option value="PLANNED">Planned</option>
                <option value="DOING">Doing</option>
                <option value="DONE">Done</option>
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as BoardMission["priority"])
                }
                className="mission-input"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </Field>
          </div>
          <Field label="Category">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mission-input"
            />
          </Field>
          <Field label="Due date">
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mission-input"
            />
          </Field>
          {error && (
            <p role="alert" className="border-error text-error border p-sm text-sm">
              {error}
            </p>
          )}
        </div>

        <footer className="border-outline-variant bg-surface-container-low flex gap-md border-t p-lg">
          {mode === "edit" && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving}
              className="border-error text-error hover:bg-error hover:text-on-error border px-md transition-colors disabled:opacity-40"
              aria-label="Delete mission"
            >
              <MaterialIcon name="delete" size={20} />
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving || title.trim().length === 0}
            className="bg-primary text-on-primary font-label-md flex-1 py-sm uppercase tracking-wider disabled:opacity-40"
          >
            {isSaving ? "Saving..." : mode === "create" ? "Create Mission" : "Save Changes"}
          </button>
        </footer>
      </form>
      <style jsx global>{`
        .drawer-overlay {
          background: rgba(30, 27, 21, 0.2);
          backdrop-filter: blur(2px);
        }
        .mission-input {
          width: 100%;
          border: 1px solid var(--color-outline-variant);
          background: var(--color-surface);
          padding: 0.65rem;
          outline: none;
        }
        .mission-input:focus {
          border-color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="font-label-sm text-on-surface-variant uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
