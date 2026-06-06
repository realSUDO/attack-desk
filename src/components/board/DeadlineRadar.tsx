import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

export type RadarDeadline = {
  id: string;
  title: string;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

type Group = {
  title: string;
  tone: "today" | "week" | "upcoming";
  items: ReadonlyArray<RadarDeadline>;
};

const MS_DAY = 1000 * 60 * 60 * 24;
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function groupDeadlines(
  deadlines: ReadonlyArray<RadarDeadline>,
): readonly [Group, Group, Group] {
  const now = new Date();
  const today: RadarDeadline[] = [];
  const week: RadarDeadline[] = [];
  const upcoming: RadarDeadline[] = [];

  for (const d of deadlines) {
    const days = Math.round((startOfDay(d.dueDate) - startOfDay(now)) / MS_DAY);
    if (days < 0) today.push(d);
    else if (days === 0) today.push(d);
    else if (days <= 7) week.push(d);
    else upcoming.push(d);
  }

  return [
    { title: "DUE TODAY", tone: "today", items: today },
    { title: "THIS WEEK", tone: "week", items: week },
    { title: "UPCOMING", tone: "upcoming", items: upcoming },
  ];
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatWeekday = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

const formatUpcoming = (d: Date) =>
  d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();

const groupHeaderClass = {
  today: "font-label-sm text-on-secondary-container bg-secondary-container/20 border-secondary border-l-2 px-sm py-1",
  week: "font-label-sm text-on-surface-variant border-outline-variant border-l-2 px-sm py-1",
  upcoming:
    "font-label-sm text-on-surface-variant border-outline-variant border-l-2 px-sm py-1",
} as const;

type Props = { deadlines: ReadonlyArray<RadarDeadline> };

export function DeadlineRadar({ deadlines }: Props) {
  const [today, week, upcoming] = groupDeadlines(deadlines);

  return (
    <aside className="border-outline-variant bg-surface-container-low flex w-72 flex-col gap-xl border-l p-lg">
      <div className="flex flex-col gap-md">
        <div className="border-primary flex items-center gap-sm border-b pb-xs">
          <MaterialIcon name="radar" size={20} />
          <h2 className="mono-label font-label-md font-bold">DEADLINE RADAR</h2>
        </div>

        {([
          ["today", today],
          ["week", week],
          ["upcoming", upcoming],
        ] as const).map(([key, group]) => (
          <div key={key} className="flex flex-col gap-sm">
            <h3 className={groupHeaderClass[group.tone]}>{group.title}</h3>
            <div className="flex flex-col gap-xs">
              {group.items.length === 0 ? (
                <p className="text-on-surface-variant px-sm py-2 text-[12px]">
                  Nothing scheduled.
                </p>
              ) : (
                group.items.map((d) => (
                  <DeadlineRow key={d.id} deadline={d} variant={group.tone} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-outline-variant mt-auto bg-white p-xs border">
        <div className="bg-surface-container-highest aspect-square flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- matches original HTML */}
          <img
            className="h-full w-full object-cover grayscale"
            data-alt="A macro close-up of a high-end analog planner with crisp black ink on cream paper. The scene is illuminated by sharp morning sunlight coming through a window, casting long architectural shadows. The aesthetic is extremely minimalist and orderly, featuring a monochromatic color palette with subtle warm undertones. It evokes a sense of deep focus and professional productivity."
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSDASR9V5OeAp0jZosbF5sgotiW3rE6Tb2r9EI985rkyTtT3UFaRDoRozgr39-A2R20bPQhTKWEEqajFx42QoudU63HCOy94fZwPFnMsusgXyQOJQjf1P9GgqC41LsUthXkTn3H7ATAFPAG0BBF4-d1xVPbPg_rZemroEa48B2jUOufZ56Ty958CCu9im7EZx3mRpmZ9fGO5q3zIzvnNP-wDGdXwYM1J30eFVwUUOXcS1LdBvdbEzEhv9AJXcQizE0rZa5rARaUAM"
            alt="Analog planner"
          />
        </div>
      </div>
    </aside>
  );
}

function DeadlineRow({
  deadline,
  variant,
}: {
  deadline: RadarDeadline;
  variant: "today" | "week" | "upcoming";
}) {
  if (variant === "today") {
    const progress = Math.min(
      0.95,
      Math.max(0.1, ((new Date().getHours() + 1) / 24)),
    );
    return (
      <div className="bg-surface-container border-outline-variant p-sm text-[12px] font-medium border">
        <div className="mb-1 flex justify-between">
          <span>{deadline.title}</span>
          <span className="text-error">{formatTime(deadline.dueDate)}</span>
        </div>
        <div className="bg-surface-container-highest h-1 w-full">
          <div
            className="bg-error h-1"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    );
  }
  if (variant === "week") {
    return (
      <div className="border-outline-variant p-sm flex justify-between border text-[12px]">
        <span>{deadline.title}</span>
        <span className="text-on-surface-variant">
          {formatWeekday(deadline.dueDate)}
        </span>
      </div>
    );
  }
  return (
    <div className="border-outline-variant p-sm text-on-surface-variant flex justify-between border border-dashed text-[12px]">
      <span>{deadline.title}</span>
      <span>{formatUpcoming(deadline.dueDate)}</span>
    </div>
  );
}
