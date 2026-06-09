"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import type { DashboardStats } from "@/db/queries/stats";
import { useSignedIn } from "@/hooks/useData";
import {
  localGetCanvases,
  localGetDeadlines,
  localGetMissions,
  localGetPosts,
} from "@/lib/local-storage-db";

const emptyStats: DashboardStats = {
  fetchedAt: 0,
  missions: { planned: 0, doing: 0, done: 0 },
  weeklyPulse: { completedThisCycle: 0, streakDays: 0 },
  upcomingDeadline: null,
  postLab: { experiments: 0, hypotheses: 0, validated: 0, archived: 0 },
  recentCanvas: null,
  todaysFocus: null,
};

const CACHE_KEY = "ad:dashboard:stats";

function parseStats(raw: DashboardStats): DashboardStats {
  if (raw.upcomingDeadline?.dueDate) {
    raw.upcomingDeadline.dueDate = new Date(raw.upcomingDeadline.dueDate);
  }
  if (raw.recentCanvas?.updatedAt) {
    raw.recentCanvas.updatedAt = new Date(raw.recentCanvas.updatedAt);
  }
  return raw;
}

function countdownFor(dueDate: Date): string {
  const hours = Math.max(
    0,
    Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60)),
  );
  return hours >= 24
    ? `T-${Math.floor(hours / 24)}D`
    : `T-${String(hours).padStart(2, "0")}H`;
}

function getLocalDashboardStats(): DashboardStats {
  const missions = localGetMissions();
  const posts = localGetPosts();
  const activeDeadlines = localGetDeadlines().filter((d) => d.status === "ACTIVE");
  const canvases = localGetCanvases();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const topMission =
    missions.find((m) => m.status === "DOING") ??
    missions.find((m) => m.status === "PLANNED") ??
    null;
  const upcomingDeadline = activeDeadlines[0] ?? null;
  const recentCanvas = canvases[0] ?? null;

  return {
    fetchedAt: Date.now(),
    missions: {
      planned: missions.filter((m) => m.status === "PLANNED").length,
      doing: missions.filter((m) => m.status === "DOING").length,
      done: missions.filter((m) => m.status === "DONE").length,
    },
    weeklyPulse: {
      completedThisCycle: missions.filter(
        (m) => m.status === "DONE" && new Date(m.updatedAt).getTime() >= oneWeekAgo,
      ).length,
      streakDays: 0,
    },
    upcomingDeadline: upcomingDeadline
      ? {
          id: upcomingDeadline.id,
          title: upcomingDeadline.title,
          dueDate: new Date(upcomingDeadline.dueDate),
          priority: upcomingDeadline.priority,
        }
      : null,
    postLab: {
      experiments: posts.filter((p) => p.status === "IDEA").length,
      hypotheses: posts.filter((p) => p.status === "DRAFTING").length,
      validated: posts.filter((p) => p.status === "READY").length,
      archived: posts.filter((p) => p.status === "POSTED").length,
    },
    recentCanvas: recentCanvas
      ? {
          id: recentCanvas.id,
          title: recentCanvas.title,
          updatedAt: new Date(recentCanvas.updatedAt),
          thumbnail: recentCanvas.thumbnail,
        }
      : null,
    todaysFocus: topMission
      ? {
          title: topMission.title,
          status: topMission.status,
          priority: topMission.priority,
        }
      : null,
  };
}

export function DashboardStatsClient({
  databaseAvailable,
}: {
  databaseAvailable: boolean;
}) {
  const isSignedIn = useSignedIn();
  const [stats, setStats] = useState<DashboardStats>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) return parseStats(JSON.parse(raw));
    } catch {}
    return emptyStats;
  });
  const fetching = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!isSignedIn) {
      setStats(getLocalDashboardStats());
      return;
    }
    if (fetching.current || !databaseAvailable) return;
    fetching.current = true;
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Fetch failed");
      const data: DashboardStats = parseStats(await res.json());
      setStats(data);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
    } catch {
      // keep current stats
    } finally {
      fetching.current = false;
    }
  }, [databaseAvailable, isSignedIn]);

  useEffect(() => {
    void Promise.resolve().then(fetchStats);
  }, [fetchStats]);

  const databaseUnavailable = isSignedIn && !databaseAvailable;

  const focusTitle = stats.todaysFocus?.title ?? "No active mission";
  const focusPriority = stats.todaysFocus?.priority ?? "UNSET";
  const focusStatusRaw = stats.todaysFocus?.status ?? "PLANNED";
  const focusStatus =
    focusStatusRaw === "DOING"
      ? "ACTIVE SESSION"
      : focusStatusRaw === "DONE"
        ? "COMPLETED"
        : "QUEUED";

  const missions = stats.missions;
  const weeklyPulse = stats.weeklyPulse;
  const postLab = stats.postLab;

  const deadline = stats.upcomingDeadline
      ? {
          title: stats.upcomingDeadline.title,
          day: new Date(stats.upcomingDeadline.dueDate).toLocaleDateString(
            "en-US",
            { weekday: "long" },
          ),
          time: new Date(stats.upcomingDeadline.dueDate).toLocaleTimeString(
            "en-US",
            { hour: "2-digit", minute: "2-digit", hour12: true },
          ),
          countdown: countdownFor(stats.upcomingDeadline.dueDate),
          priority: stats.upcomingDeadline.priority,
        }
      : {
          title: "No active deadline",
          day: "Unscheduled",
          time: "--:--",
          countdown: "T---",
          priority: "LOW",
        };

  const recentCanvas = stats.recentCanvas
      ? {
          id: stats.recentCanvas.id,
          title: stats.recentCanvas.title,
          thumbnail: stats.recentCanvas.thumbnail ?? null,
          updatedAtMinutesAgo: Math.max(
            0,
            Math.floor((stats.fetchedAt - stats.recentCanvas.updatedAt.getTime()) / 60000),
          ),
        }
      : null;

  return (
    <div className="grid grid-cols-12 gap-gutter p-margin-mobile md:p-margin-desktop">
      {databaseUnavailable && (
        <p className="border-error text-error col-span-12 border p-sm text-sm">
          Database unavailable. Start PostgreSQL and configure DATABASE_URL.
        </p>
      )}
      {/* Row 1: Today's Focus + Weekly Pulse */}
      <section className="border border-outline-variant hover:border-primary col-span-12 flex min-h-[240px] flex-col justify-between p-lg lg:col-span-8">
        <div>
          <span className="font-metadata text-metadata text-primary mb-sm block uppercase tracking-[0.2em]">
            Today&apos;s Focus
          </span>
          <h2 className="font-display text-display max-w-2xl leading-tight">
            {focusTitle}
          </h2>
        </div>
        <div className="border-outline-variant mt-lg flex items-end justify-between border-t pt-md">
          <div className="flex gap-xl">
            <div>
              <span className="font-metadata text-metadata text-on-surface-variant block uppercase">
                Status
              </span>
              <span className="font-label-md text-label-md text-primary">
                {focusStatus}
              </span>
            </div>
            <div>
              <span className="font-metadata text-metadata text-on-surface-variant block uppercase">
                Priority
              </span>
              <span className="font-label-md text-label-md">
                {focusPriority}
              </span>
            </div>
          </div>
          <Link
            href="/board"
            className="border-primary font-label-md text-label-md hover:bg-primary hover:text-on-primary border px-lg py-xs uppercase transition-all"
          >
            Update
          </Link>
        </div>
      </section>

      <section className="border border-outline-variant hover:border-primary col-span-12 flex flex-col p-lg lg:col-span-4">
        <span className="font-metadata text-metadata text-on-surface-variant mb-lg block uppercase tracking-[0.2em]">
          Weekly Pulse
        </span>
        <div className="flex flex-1 flex-col justify-center">
          <div className="font-display mb-xs text-[64px] leading-none">
            {weeklyPulse.completedThisCycle}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Missions completed this cycle.
          </p>
        </div>
        <div className="border-outline-variant mt-auto border-t pt-md">
          <div className="flex items-center justify-between">
            <span className="font-metadata text-metadata">PULSE STREAK</span>
            <span className="font-label-md text-label-md text-primary">
              {weeklyPulse.streakDays} DAYS
            </span>
          </div>
        </div>
      </section>

      {/* Row 2: Mission Status + Deadline Radar */}
      <section className="border border-outline-variant hover:border-primary col-span-12 flex flex-col md:col-span-4">
        <div className="border-outline-variant border-b p-lg">
          <span className="font-metadata text-metadata text-on-surface-variant uppercase tracking-[0.2em]">
            Mission Status
          </span>
        </div>
        <div className="flex flex-col gap-md p-lg">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md">PLANNED</span>
            <span className="font-display text-headline-md">
              {String(missions.planned).padStart(2, "0")}
            </span>
          </div>
          <div className="bg-outline-variant/50 h-px" />
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md">DOING</span>
            <span className="font-display text-headline-md text-primary">
              {String(missions.doing).padStart(2, "0")}
            </span>
          </div>
          <div className="bg-outline-variant/50 h-px" />
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md">DONE</span>
            <span className="font-display text-headline-md">
              {String(missions.done).padStart(2, "0")}
            </span>
          </div>
        </div>
      </section>

      <section className="border border-outline-variant hover:border-primary bg-surface-container-low col-span-12 flex flex-col p-lg md:col-span-8">
        <div className="mb-xl flex items-start justify-between">
          <span className="font-metadata text-metadata text-error uppercase tracking-[0.2em]">
            Deadline Radar
          </span>
          <MaterialIcon name="sensors" size={20} className="text-error" />
        </div>
        <div className="mb-auto">
          <h3 className="font-headline-lg text-headline-lg mb-xs">
            {deadline.title}
          </h3>
          <p className="font-metadata text-metadata text-on-surface-variant uppercase">
            Due {deadline.day}, {deadline.time}
          </p>
        </div>
        <div className="mt-xl flex items-center justify-between">
          <div className="-space-x-px flex">
            <div className="border-outline font-metadata flex h-6 w-12 items-center justify-center border px-1 text-[10px]">
              {deadline.countdown}
            </div>
            <div className="border-outline bg-primary h-6 w-12 border" />
            <div className="border-outline bg-primary h-6 w-12 border" />
            <div className="border-outline bg-outline-variant h-6 w-12 border" />
          </div>
          <span className="font-label-md text-label-md">
            {deadline.priority === "CRITICAL"
              ? "URGENT ACTION REQUIRED"
              : deadline.priority === "HIGH"
                ? "ACTION RECOMMENDED"
                : "ON TRACK"}
          </span>
        </div>
      </section>

      {/* Row 3: Post Lab Status + Recent Canvas */}
      <section className="border border-outline-variant hover:border-primary col-span-12 p-lg md:col-span-6">
        <div className="border-outline-variant mb-lg flex items-center justify-between border-b pb-sm">
          <span className="font-metadata text-metadata text-on-surface-variant uppercase tracking-[0.2em]">
            Post Lab Status
          </span>
          <span className="font-label-sm text-label-sm mono">v4.0.2</span>
        </div>
        <div className="grid grid-cols-2 gap-lg">
          <div className="border border-outline-variant p-md">
            <span className="font-metadata text-metadata mb-xs block">
              EXPERIMENTS
            </span>
            <span className="font-display text-headline-md">
              {String(postLab.experiments).padStart(2, "0")}
            </span>
          </div>
          <div className="border border-outline-variant p-md">
            <span className="font-metadata text-metadata mb-xs block">
              HYPOTHESES
            </span>
            <span className="font-display text-headline-md">
              {String(postLab.hypotheses).padStart(2, "0")}
            </span>
          </div>
          <div className="border border-outline-variant p-md">
            <span className="font-metadata text-metadata mb-xs block">
              VALIDATED
            </span>
            <span className="font-display text-headline-md">
              {String(postLab.validated).padStart(2, "0")}
            </span>
          </div>
          <div className="border border-outline-variant p-md">
            <span className="font-metadata text-metadata mb-xs block">
              ARCHIVED
            </span>
            <span className="font-display text-headline-md">
              {String(postLab.archived).padStart(2, "0")}
            </span>
          </div>
        </div>
      </section>

      <Link
        href={recentCanvas ? `/canvas/${recentCanvas.id}` : "/canvas"}
        className="border border-outline-variant hover:border-primary bg-primary text-on-primary col-span-12 flex flex-col p-lg md:col-span-6"
      >
        <div className="mb-lg flex items-start justify-between">
          <span className="font-metadata text-metadata opacity-60 uppercase tracking-[0.2em]">
            Recent Canvas
          </span>
          <MaterialIcon name="north_east" size={20} />
        </div>
        <div className="mb-auto">
          <h3 className="font-headline-md text-headline-md mb-xs">
            {recentCanvas?.title ?? "No canvas yet"}
          </h3>
          <p className="font-metadata text-metadata opacity-60">
            {recentCanvas
              ? `Last edited ${recentCanvas.updatedAtMinutesAgo}m ago`
              : "Create your first visual workspace"}
          </p>
        </div>
        <div className="border-on-primary/20 relative mt-xl h-[120px] overflow-hidden border">
          {recentCanvas?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recentCanvas.thumbnail} alt="Canvas preview" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-label-md text-label-md tracking-widest opacity-40">
                NO PREVIEW
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
