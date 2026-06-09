export function WeeklyReviewSkeleton() {
  return (
    <div className="ml-0 flex min-h-screen flex-col md:ml-20">
      <div className="border-outline-variant flex items-center justify-between border-b px-margin-mobile py-sm md:px-margin-desktop">
        <div className="bg-outline-variant h-5 w-44 animate-pulse rounded" />
        <div className="bg-outline-variant h-9 w-32 animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-md p-margin-mobile md:p-margin-desktop">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-outline-variant h-36 animate-pulse rounded border" />
        ))}
      </div>
    </div>
  );
}
