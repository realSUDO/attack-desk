import { Suspense } from "react";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardStatsClient } from "@/components/dashboard/DashboardStatsClient";

// Dynamic so DATABASE_URL is checked at request time, not build time.
// No DB queries in this component — data is fetched client-side via API.
export const dynamic = "force-dynamic";

const dbAvailable = Boolean(process.env.DATABASE_URL);

export default function DashboardPage() {
  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <main className="ml-20 flex min-h-screen flex-col">
        <CommandBar sessionDate={formatSessionDate(new Date())} />
        <Suspense fallback={<div className="grid grid-cols-12 gap-gutter p-margin-mobile md:p-margin-desktop" />}>
          <DashboardStatsClient databaseAvailable={dbAvailable} />
        </Suspense>
      </main>
    </div>
  );
}

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}
