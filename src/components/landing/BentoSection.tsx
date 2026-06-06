import { MaterialIcon } from "./icons/MaterialIcon";

const items = [
  {
    icon: "grid_view",
    title: "Structured Clarity",
    body: "Organize your projects into discrete &lsquo;Missions&rsquo; with clear exit criteria and milestones.",
  },
  {
    icon: "psychology",
    title: "Spatial Thinking",
    body: "The Canvas allows for non-linear brainstorming, linking nodes to your actual project data.",
  },
  {
    icon: "bolt",
    title: "Instant Execution",
    body: "Move from idea to drafting in the Post Lab with optimized shortcuts for writers.",
  },
] as const;

export function BentoSection() {
  return (
    <section
      id="methodology"
      className="border-outline-variant bg-surface-container-low border-y py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-12">
        <div className="mb-16 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div className="max-w-xl">
            <span className="font-label-sm text-label-sm text-secondary mb-4 block uppercase tracking-[0.2em]">
              The Methodology
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              High-fidelity tools for the modern knowledge worker.
            </h2>
          </div>
          <p className="font-body-md text-body-md max-w-sm text-on-surface-variant">
            We&apos;ve removed the round corners and the distractions. AttackDesk
            is an OS for people who ship.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map(({ icon, title, body }) => (
            <article
              key={title}
              className="flex cursor-default flex-col gap-4 border border-outline-variant bg-background p-6 transition-colors hover:border-primary"
            >
              <MaterialIcon
                name={icon}
                size={32}
                className="text-primary"
              />
              <h3 className="font-headline-md text-headline-md">{title}</h3>
              <p className="font-body-md text-on-surface-variant">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
