export function BoardSkeleton() {
  return (
    <div className="ml-20 flex h-screen flex-col">
      <div className="border-outline-variant flex items-center justify-between border-b px-margin-mobile py-sm md:px-margin-desktop">
        <div className="bg-outline-variant h-5 w-48 animate-pulse rounded" />
        <div className="bg-outline-variant h-9 w-28 animate-pulse rounded" />
      </div>
      <div className="flex flex-1 gap-md overflow-auto p-margin-mobile md:p-margin-desktop">
        {["PLANNED", "DOING", "DONE"].map((col) => (
          <div key={col} className="border-outline-variant flex flex-1 flex-col gap-md rounded border p-md">
            <div className="bg-outline-variant mb-sm h-4 w-20 animate-pulse rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-outline-variant h-28 animate-pulse rounded border" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
