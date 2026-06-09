export function CanvasSkeleton() {
  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-md">
        <div className="border-outline-variant h-6 w-48 animate-pulse rounded border" />
        <div className="text-on-surface-variant font-label-md text-label-md">Loading canvas...</div>
      </div>
    </div>
  );
}
