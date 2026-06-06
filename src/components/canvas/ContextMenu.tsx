"use client";

import { useEffect, useRef } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

type Item = {
  label: string;
  icon: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

type Props = {
  x: number;
  y: number;
  items: ReadonlyArray<{ kind: "item"; item: Item } | { kind: "divider" }>;
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Clamp to viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;
    if (rect.right > vw) nx = Math.max(0, vw - rect.width - 4);
    if (rect.bottom > vh) ny = Math.max(0, vh - rect.height - 4);
    el.style.left = `${nx}px`;
    el.style.top = `${ny}px`;
  }, [x, y]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      className="border-outline bg-surface fixed z-50 min-w-[200px] border py-xs shadow-lg"
    >
      {items.map((entry, i) => {
        if (entry.kind === "divider") {
          return <div key={`d-${i}`} className="bg-outline-variant my-xs h-px" />;
        }
        const it = entry.item;
        return (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            onClick={() => {
              if (it.disabled) return;
              it.onClick();
              onClose();
            }}
            disabled={it.disabled}
            className={`flex w-full items-center gap-sm px-md py-sm text-left font-label-sm uppercase transition-colors disabled:opacity-30 ${
              it.destructive
                ? "text-error hover:bg-surface-container-highest"
                : "text-on-surface hover:bg-surface-container-highest"
            }`}
          >
            <MaterialIcon name={it.icon} size={16} />
            <span className="flex-1">{it.label}</span>
            {it.shortcut && (
              <span className="font-metadata text-metadata text-on-surface-variant">
                {it.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
