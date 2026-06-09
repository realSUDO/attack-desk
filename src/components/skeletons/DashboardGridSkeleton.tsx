export function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-gutter p-margin-mobile md:p-margin-desktop">
      <div className="border-outline-variant col-span-12 h-[240px] animate-pulse rounded border lg:col-span-8" />
      <div className="border-outline-variant col-span-12 h-[240px] animate-pulse rounded border lg:col-span-4" />
      <div className="border-outline-variant col-span-12 h-[200px] animate-pulse rounded border md:col-span-4" />
      <div className="border-outline-variant col-span-12 h-[200px] animate-pulse rounded border md:col-span-8" />
      <div className="border-outline-variant col-span-12 h-[200px] animate-pulse rounded border md:col-span-6" />
      <div className="border-outline-variant col-span-12 h-[200px] animate-pulse rounded border md:col-span-6" />
    </div>
  );
}
