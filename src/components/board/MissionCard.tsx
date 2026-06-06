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
  { label: string; tone: "muted" | "primary" }
> = {
  CRITICAL: { label: "PRIORITY: CRITICAL", tone: "primary" },
  HIGH: { label: "PRIORITY: HIGH", tone: "muted" },
  MEDIUM: { label: "PRIORITY: MED", tone: "muted" },
  LOW: { label: "PRIORITY: LOW", tone: "muted" },
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

export function MissionCard({ mission, onSelect }: Props) {
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
      className={`mission-card bg-surface-container-low border border-outline-variant hover:border-primary p-md flex cursor-pointer flex-col gap-sm transition-all duration-200 ${
        isDoing ? "border-l-primary border-l-4" : ""
      } ${isDone ? "opacity-60 grayscale" : ""}`}
    >
      <div className="flex items-start justify-between">
        {style.tone === "primary" ? (
          <span className="mono-label text-primary bg-secondary-container px-xs text-[10px] font-bold">
            {style.label}
          </span>
        ) : (
          <span className="mono-label text-on-surface-variant bg-surface-container-highest px-xs text-[10px]">
            {style.label}
          </span>
        )}
        <MaterialIcon name="edit" size={14} />
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
}
