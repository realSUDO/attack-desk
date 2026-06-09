export function PostLabSkeleton() {
  return (
    <div className="ml-0 flex h-screen flex-col md:ml-20">
      <div className="border-outline-variant flex items-center justify-between border-b px-margin-mobile py-sm md:px-margin-desktop">
        <div className="bg-outline-variant h-5 w-40 animate-pulse rounded" />
      </div>
      <div className="flex flex-1 gap-md overflow-auto p-margin-mobile md:p-margin-desktop">
        {["IDEA", "DRAFTING", "PUBLISHED", "ARCHIVED"].map((col) => (
          <div key={col} className="border-outline-variant flex flex-1 flex-col gap-md rounded border p-md">
            <div className="bg-outline-variant mb-sm h-4 w-24 animate-pulse rounded" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-outline-variant h-32 animate-pulse rounded border" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
