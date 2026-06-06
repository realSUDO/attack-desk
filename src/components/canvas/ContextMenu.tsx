"use client";

import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

type Props = {
  x: number;
  y: number;
  ids: ReadonlyArray<string>;
  isGrouped: boolean;
  onClose: () => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function ContextMenu({
  x,
  y,
  ids,
  isGrouped,
  onClose,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onGroup,
  onUngroup,
  onDuplicate,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    // Keep the menu within the viewport.
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;
    if (x + rect.width > vw) nx = vw - rect.width - 8;
    if (y + rect.height > vh) ny = vh - rect.height - 8;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleAction = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div
      ref={ref}
      className="border-outline-variant bg-surface fixed z-50 flex min-w-[200px] flex-col border shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      <Item
        icon="flip_to_front"
        label="Bring to Front"
        shortcut="⌘]"
        onClick={handleAction(() => onBringToFront(ids[0]!))}
      />
      <Item
        icon="flip_to_front"
        label="Bring Forward"
        shortcut="⌘⌥]"
        onClick={handleAction(() => onBringForward(ids[0]!))}
      />
      <Item
        icon="flip_to_back"
        label="Send Backward"
        shortcut="⌘⌥["
        onClick={handleAction(() => onSendBackward(ids[0]!))}
      />
      <Item
        icon="flip_to_back"
        label="Send to Back"
        shortcut="⌘["
        onClick={handleAction(() => onSendToBack(ids[0]!))}
      />
      <Divider />
      <Item
        icon="group_work"
        label="Group"
        shortcut="⌘G"
        disabled={ids.length < 2}
        onClick={handleAction(onGroup)}
      />
      <Item
        icon="group_off"
        label="Ungroup"
        shortcut="⌘⇧G"
        disabled={!isGrouped}
        onClick={handleAction(onUngroup)}
      />
      <Divider />
      <Item
        icon="content_copy"
        label="Duplicate"
        shortcut="⌘D"
        onClick={handleAction(onDuplicate)}
      />
      <Item
        icon="delete"
        label="Delete"
        shortcut="⌫"
        onClick={handleAction(onDelete)}
      />
    </div>
  );
}

function Item({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hover:bg-surface-container-highest flex items-center justify-between gap-md px-md py-sm text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="flex items-center gap-sm">
        <MaterialIcon name={icon} size={16} />
        {label}
      </span>
      {shortcut && (
        <span className="font-metadata text-metadata text-on-surface-variant">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="bg-outline-variant h-px" />;
}
