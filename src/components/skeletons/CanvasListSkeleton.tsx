export function CanvasListSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-outline-variant flex items-center justify-between border-b px-margin-mobile py-sm md:px-margin-desktop">
        <div className="bg-outline-variant h-5 w-36 animate-pulse rounded" />
      </div>
      <div className="flex flex-1 flex-wrap gap-md overflow-auto p-margin-mobile md:p-margin-desktop">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-outline-variant h-44 w-72 animate-pulse rounded border"
          />
        ))}
      </div>
    </div>
  );
}
