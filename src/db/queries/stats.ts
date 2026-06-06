import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [
    totalMissions,
    doingMissions,
    criticalActiveDeadlines,
    readyPosts,
    totalCanvases,
  ] = await prisma.$transaction([
    prisma.mission.count(),
    prisma.mission.count({ where: { status: "DOING" } }),
    prisma.deadline.count({
      where: {
        status: "ACTIVE",
        priority: "CRITICAL",
      },
    }),
    prisma.postIdea.count({ where: { status: "READY" } }),
    prisma.canvas.count(),
  ]);

  return {
    totalMissions,
    doingMissions,
    criticalActiveDeadlines,
    readyPosts,
    totalCanvases,
  };
}

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
