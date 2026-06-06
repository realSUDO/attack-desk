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
            <div className="group relative overflow-hidden border border-outline-variant bg-background">
              <DashboardImage />

              {/* Overlay UI fragments — match original colors */}
              <div className="absolute top-4 right-4 hidden w-48 -translate-x-4 translate-y-4 border border-outline bg-surface-container p-4 shadow-sm transition-transform duration-500 group-hover:translate-x-0 group-hover:translate-y-0 lg:block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                    Active Mission
                  </span>
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                </div>
                <div className="mb-1 h-1 w-full bg-outline-variant" />
                <div className="h-1 w-3/4 bg-outline-variant" />
              </div>

              <div className="absolute bottom-4 left-4 hidden w-56 -translate-x-4 -translate-y-4 border border-primary bg-primary p-4 text-on-primary shadow-sm transition-transform delay-75 duration-500 group-hover:translate-x-0 group-hover:translate-y-0 lg:block">
                <span className="font-label-sm text-label-sm uppercase opacity-70">
                  Deadline: Project X
                </span>
                <p className="mt-1 font-label-md text-label-md">
                  02 Days : 14 Hours
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -top-4 -right-4 h-12 w-12 border-t border-r border-primary" />
          <div className="absolute -bottom-4 -left-4 h-12 w-12 border-b border-l border-primary" />
        </div>
      </div>
    </main>
  );
}

function DashboardImage() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- matches original HTML
    <img
      alt="AttackDesk Dashboard Interface"
      className="h-auto w-full scale-105 grayscale transition-all duration-700 ease-in-out group-hover:scale-100 group-hover:grayscale-0"
      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAesYLHfYGLhxqjSUgwa4e2T1UJ85nogF-ZTdTiSNapHzlXE9x0cH-BXFmk5PEdMxhaNIQ_eeyYBltMjspxv7cIUoQN3287jGYSjj0rr5cJ9j75R01vXxQzUFE-g3GbQ-1Dc2akSA0PPcLj0zV7yHbo4zc_F1nRGCsnkotZ2lPeR1wtfUldWl-FQIzDyUdv9ES4x9i4-UWLrYpFqokhBwN6Mwh7Ve3twnJgkqVwLAEWBaVvGWC9BEvw8zv3l1kFSdQPirM29YO19I"
    />
  );
}
