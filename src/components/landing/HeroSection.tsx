import { MaterialIcon } from "./icons/MaterialIcon";

const features = [
  {
    icon: "assignment",
    label: "Missions",
    text: "Objective-led task management.",
  },
  {
    icon: "schedule",
    label: "Deadlines",
    text: "Timeline tracking with zero noise.",
  },
  {
    icon: "edit_note",
    label: "Post Lab",
    text: "Precision content crafting studio.",
  },
  {
    icon: "auto_fix_high",
    label: "Canvas",
    text: "Infinite space for spatial thinking.",
  },
] as const;

export function HeroSection() {
  return (
    <main className="pt-32 pb-16 hero-pattern">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-6 px-4 md:grid-cols-12 md:px-12">
        {/* Left */}
        <div className="flex flex-col gap-10 md:col-span-6">
          <div className="space-y-4">
            <h1 className="font-display text-display max-w-lg text-primary">
              AttackDesk
            </h1>
            <p className="font-headline-lg text-headline-lg leading-tight text-on-surface-variant">
              Plan your day. Map your ideas. Track your deadlines. Ship your
              work.
            </p>
          </div>

          <p className="font-body-lg text-body-lg max-w-md text-on-surface-variant">
            A visual execution workspace for missions, deadlines, content ideas,
            and freeform thinking. Built for the high-focus professional.
          </p>

          <div className="mt-2 flex flex-wrap gap-4">
            <a
              href="/dashboard"
              className="border border-primary bg-primary px-10 py-4 font-label-md text-label-md text-on-primary transition-all duration-300 hover:bg-surface-container-highest hover:text-primary"
            >
              OPEN WORKSPACE
            </a>
            <a
              href="#methodology"
              className="border border-outline bg-transparent px-10 py-4 font-label-md text-label-md text-primary transition-all duration-300 hover:bg-surface-container-low"
            >
              VIEW DEMO
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-outline-variant pt-10">
            {features.map(({ icon, label, text }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-primary">
                  <MaterialIcon name={icon} size={18} />
                  <span className="font-label-md text-label-md uppercase tracking-wider">
                    {label}
                  </span>
                </div>
                <p className="text-metadata text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right preview */}
        <div id="hero-preview" className="relative mt-10 md:col-span-6 md:mt-0">
          <div className="border border-outline-variant bg-surface p-2 shadow-sm">
            <div className="group relative overflow-hidden border border-outline-variant bg-[#0d0d0d]">
              <DashboardPreview />

              {/* Overlay UI fragments */}
              <div className="absolute top-4 right-4 hidden w-48 -translate-x-4 translate-y-4 border border-[#1f1f1f] bg-[#111] p-4 shadow-sm transition-transform duration-500 group-hover:translate-x-0 group-hover:translate-y-0 lg:block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase text-[#777]">
                    Active Mission
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#ff9166]" />
                </div>
                <div className="mb-1 h-1 w-full bg-[#222]" />
                <div className="h-1 w-3/4 bg-[#222]" />
              </div>

              <div className="absolute bottom-4 left-4 hidden w-56 -translate-x-4 -translate-y-4 border border-[#ff9166] bg-[#ff9166] p-4 text-[#0d0d0d] shadow-sm transition-transform delay-75 duration-500 group-hover:translate-x-0 group-hover:translate-y-0 lg:block">
                <span className="font-label-sm text-label-sm uppercase opacity-70">
                  Deadline: Project X
                </span>
                <p className="mt-1 font-label-md text-label-md font-bold">
                  02 Days : 14 Hours
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -top-4 -right-4 h-12 w-12 border-t border-r border-[#ff9166]" />
          <div className="absolute -bottom-4 -left-4 h-12 w-12 border-b border-l border-[#ff9166]" />
        </div>
      </div>
    </main>
  );
}

function DashboardPreview() {
  const items = [
    { icon: "target", label: "Q2 Product Launch", status: "active" },
    { icon: "flag", label: "Design System V2", status: "active" },
    { icon: "check_circle", label: "Content Audit", status: "done" },
    { icon: "target", label: "Brand Guidelines", status: "active" },
    { icon: "flag", label: "User Research", status: "active" },
  ] as const;
  const deadlines = [
    { label: "Design Review", days: "02", hours: "14" },
    { label: "Copy Draft", days: "05", hours: "08" },
    { label: "Sprint Retro", days: "07", hours: "00" },
  ] as const;
  return (
    <div className="flex h-full min-h-[400px] flex-col bg-[#0d0d0d] text-[#e8e8e8] font-mono text-[10px] leading-tight transition-all duration-700 ease-in-out group-hover:scale-100 md:min-h-[520px]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff9166]" />
          <span className="text-[11px] font-bold tracking-wider text-[#ff9166]">ATKDESK</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 rounded-full bg-[#1f1f1f]">
            <div className="h-full w-2/3 rounded-full bg-[#333]" />
          </div>
          <span className="text-[9px] text-[#555]">v2.1</span>
        </div>
      </div>
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="flex w-8 flex-col items-center gap-2 border-r border-[#1f1f1f] bg-[#0a0a0a] pt-2">
          {["apps", "edit_note", "auto_fix_high", "tactic", "calendar_month", "settings"].map(
            (icon, i) => (
              <span
                key={icon}
                className={`flex h-5 w-5 items-center justify-center rounded-sm text-[11px] ${
                  i === 0 ? "text-[#ff9166]" : "text-[#444]"
                }`}
              >
                <MaterialIcon name={icon} size={11} filled={i === 0} />
              </span>
            ),
          )}
        </div>
        {/* Main content */}
        <div className="flex flex-1 flex-col gap-2 p-2">
          {/* Row of stat cards */}
          <div className="flex gap-2">
            {[
              { label: "Missions", value: "12", accent: "#ff9166" },
              { label: "Active", value: "4", accent: "#5b8af5" },
              { label: "Due", value: "7", accent: "#f55b5b" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-1 flex-col gap-0.5 rounded-sm border border-[#1f1f1f] bg-[#111] p-2"
              >
                <span className="text-[8px] uppercase tracking-wider text-[#555]">{s.label}</span>
                <span className="text-[16px] font-bold" style={{ color: s.accent }}>{s.value}</span>
              </div>
            ))}
          </div>
          {/* Mission cards */}
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-wider text-[#555]">Active Missions</span>
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-sm border border-[#1f1f1f] bg-[#111] px-2 py-1.5"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.status === "active" ? "bg-[#ff9166]" : "bg-[#333]"
                  }`}
                />
                <span className="flex-1 text-[10px] text-[#ccc]">{item.label}</span>
                <span className="text-[8px] text-[#555]">{item.status}</span>
              </div>
            ))}
          </div>
          {/* Deadline cards */}
          <div className="flex gap-2">
            {deadlines.map((d) => (
              <div
                key={d.label}
                className="flex flex-1 flex-col gap-0.5 rounded-sm border border-[#1f1f1f] bg-[#111] p-2"
              >
                <span className="text-[8px] uppercase tracking-wider text-[#555]">{d.label}</span>
                <span className="text-[11px] font-bold text-[#e8e8e8]">
                  {d.days}d : {d.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
