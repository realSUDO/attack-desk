import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function getWeeklyReviews(userId: string) {
  return prisma.weeklyReview.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });
}

export function getWeeklyReviewById(id: string, userId: string) {
  return prisma.weeklyReview.findUnique({ where: { id, userId } });
}

export function createWeeklyReview(
  data: Prisma.WeeklyReviewUncheckedCreateInput,
) {
  return prisma.weeklyReview.create({ data });
}

export function updateWeeklyReview(
  id: string,
  data: Prisma.WeeklyReviewUncheckedUpdateInput,
  userId: string,
) {
  return prisma.weeklyReview.update({
    where: { id, userId },
    data,
  });
}

export function deleteWeeklyReview(id: string, userId: string) {
  return prisma.weeklyReview.delete({ where: { id, userId } });
}
