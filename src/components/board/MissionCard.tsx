import { memo } from "react";
import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

export type BoardMission = {
  id: string;
  title: string;
  description: string | null;
  status: "PLANNED" | "DOING" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: Date | null;
  category: string | null;
  deadline?: { id: string; title: string } | null;
  canvas?: { id: string; title: string } | null;
};

const priorityStyles: Record<
  BoardMission["priority"],
  { label: string; className: string }
> = {
  CRITICAL: { label: "PRIORITY: CRITICAL", className: "bg-[#ff9166] text-[#0a0a0a]" },
  HIGH:     { label: "PRIORITY: HIGH",     className: "bg-error-container text-on-error-container" },
  MEDIUM:   { label: "PRIORITY: MED",      className: "bg-surface-container-highest text-on-surface-variant" },
  LOW:      { label: "PRIORITY: LOW",      className: "bg-surface-container-highest text-on-surface-variant" },
};

const dueDateLabel = (due: Date | null): string => {
  if (!due) return "NO DATE";
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(due) - startOfDay(now)) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "DUE: TODAY";
  if (days === 1) return "DUE: TOMORROW";
  if (days > 1 && days <= 7) return `DUE: IN ${days}D`;
  if (days < 0) return `OVERDUE: ${Math.abs(days)}D`;
  return `DUE: ${due.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  }).toUpperCase()}`;
};

type Props = {
  mission: BoardMission;
  onSelect: (id: string) => void;
};

export const MissionCard = memo(function MissionCard({ mission, onSelect }: Props) {
  const style = priorityStyles[mission.priority];
  const isDoing = mission.status === "DOING";
  const isDone = mission.status === "DONE";
  const dueLabel = dueDateLabel(mission.dueDate);
  const isUrgent = /TODAY|IN [0-9]+H|IN 1D|OVERDUE/.test(dueLabel);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(mission.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(mission.id);
        }
      }}
      className={`mission-card bg-surface-container-low border border-outline-variant hover:border-primary p-md flex cursor-grab active:cursor-grabbing flex-col gap-sm transition-all duration-200 ${
        isDoing ? "border-l-primary border-l-4" : ""
      } ${isDone ? "opacity-60 grayscale" : ""}`}
    >
      <div className="flex items-start justify-between gap-sm">
        <span className={`mono-label px-xs text-[10px] font-bold ${style.className}`}>
          {style.label}
        </span>
        <MaterialIcon name="edit" size={14} className="shrink-0 text-on-surface-variant" />
      </div>
      <h3
        className={`font-headline-md text-sm font-bold ${
          isDone ? "line-through" : ""
        }`}
      >
        {mission.title}
      </h3>
      <div className="mt-xs flex flex-col gap-xs">
        <div
          className={`flex items-center gap-xs ${
            isUrgent ? "text-error" : "text-on-surface-variant"
          }`}
        >
          <MaterialIcon name="schedule" size={14} />
          <span
            suppressHydrationWarning
            className="font-label-sm text-[11px]"
          >
            {dueLabel}
          </span>
        </div>
        {mission.deadline && (
          <div className="text-on-surface-variant flex items-center gap-xs">
            <MaterialIcon name="link" size={14} />
            <span className="font-label-sm text-[11px]">
              {mission.deadline.title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
