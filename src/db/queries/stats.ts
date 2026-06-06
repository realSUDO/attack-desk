import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  fetchedAt: number;
  missions: {
    planned: number;
    doing: number;
    done: number;
  };
  weeklyPulse: {
    completedThisCycle: number;
    streakDays: number;
  };
  upcomingDeadline: {
    id: string;
    title: string;
    dueDate: Date;
    priority: string;
  } | null;
  postLab: {
    experiments: number;
    hypotheses: number;
    validated: number;
    archived: number;
  };
  recentCanvas: {
    id: string;
    title: string;
    updatedAt: Date;
  } | null;
  todaysFocus: {
    title: string;
    status: string;
    priority: string;
  } | null;
};

const emptyStats: DashboardStats = {
  fetchedAt: 0,
  missions: { planned: 0, doing: 0, done: 0 },
  weeklyPulse: { completedThisCycle: 0, streakDays: 0 },
  upcomingDeadline: null,
  postLab: { experiments: 0, hypotheses: 0, validated: 0, archived: 0 },
  recentCanvas: null,
  todaysFocus: null,
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [planned, doing, done, upcomingDeadline, recentCanvas, topMission] =
    await prisma.$transaction([
      prisma.mission.count({ where: { status: "PLANNED" } }),
      prisma.mission.count({ where: { status: "DOING" } }),
      prisma.mission.count({ where: { status: "DONE" } }),
      prisma.deadline.findFirst({
        where: { status: "ACTIVE" },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        select: { id: true, title: true, dueDate: true, priority: true },
      }),
      prisma.canvas.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.mission.findFirst({
        where: { status: "DOING" },
        orderBy: { updatedAt: "desc" },
        select: { title: true, status: true, priority: true },
      }),
    ]);

  const [experiments, hypotheses, validated, archived] = await Promise.all([
    prisma.postIdea.count({ where: { status: "IDEA" } }),
    prisma.postIdea.count({ where: { status: "DRAFTING" } }),
    prisma.postIdea.count({ where: { status: "READY" } }),
    prisma.postIdea.count({ where: { status: "POSTED" } }),
  ]);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const completedThisCycle = await prisma.mission.count({
    where: { status: "DONE", updatedAt: { gte: oneWeekAgo } },
  });

  return {
    fetchedAt: Date.now(),
    missions: { planned, doing, done },
    weeklyPulse: { completedThisCycle, streakDays: 0 },
    upcomingDeadline,
    postLab: { experiments, hypotheses, validated, archived },
    recentCanvas,
    todaysFocus: topMission,
  };
}

export const emptyDashboardStats = emptyStats;

export async function getShowcaseStats() {
  const [
    totalMissions,
    completedMissions,
    totalDeadlines,
    completedDeadlines,
    totalPostIdeas,
    postedPostIdeas,
    totalCanvases,
  ] = await prisma.$transaction([
    prisma.mission.count(),
    prisma.mission.count({ where: { status: "DONE" } }),
    prisma.deadline.count(),
    prisma.deadline.count({ where: { status: "COMPLETED" } }),
    prisma.postIdea.count(),
    prisma.postIdea.count({ where: { status: "POSTED" } }),
    prisma.canvas.count(),
  ]);

  return {
    totalMissions,
    completedMissions,
    totalDeadlines,
    completedDeadlines,
    totalPostIdeas,
    postedPostIdeas,
    totalCanvases,
  };
}
