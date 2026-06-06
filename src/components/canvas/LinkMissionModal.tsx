"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import { linkMissionToCanvasAction } from "@/actions/canvas.actions";

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

export function LinkMissionModal({ canvasId, open, onClose, missions }: Props) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return missions;
    return missions.filter(
      (m) =>
        m.title.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [missions, query]);

  if (!open) return null;

  const handleLink = async (missionId: string) => {
    setPendingId(missionId);
    await linkMissionToCanvasAction(canvasId, missionId);
    setPendingId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-outline-variant bg-surface w-full max-w-md border">
        <div className="border-outline-variant flex items-center justify-between border-b px-md py-sm">
          <h2 className="font-headline-md text-headline-md">Link Mission</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
        <div className="border-outline-variant border-b p-sm">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search missions…"
            className="font-body-md focus:border-primary w-full border border-outline bg-transparent p-sm focus:outline-hidden"
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-on-surface-variant font-body-md p-md text-center">
              No matching missions.
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleLink(m.id)}
                disabled={pendingId === m.id}
                className="hover:bg-surface-container-highest border-outline-variant flex w-full items-center justify-between border-b p-sm text-left transition-colors disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-label-md truncate">{m.title}</div>
                  <div className="font-metadata text-metadata text-on-surface-variant mt-xs flex items-center gap-sm">
                    <span>{m.status}</span>
                    <span>·</span>
                    <span>{m.priority}</span>
                  </div>
                </div>
                <MaterialIcon name="add_link" size={16} className="text-primary" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
