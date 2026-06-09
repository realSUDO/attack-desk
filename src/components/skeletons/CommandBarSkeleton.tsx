export function CommandBarSkeleton() {
  return (
    <div className="border-outline-variant flex items-center justify-between border-b px-margin-mobile py-sm md:px-margin-desktop">
      <div className="bg-outline-variant h-4 w-32 animate-pulse rounded" />
      <div className="bg-outline-variant h-4 w-20 animate-pulse rounded" />
    </div>
  );
}
