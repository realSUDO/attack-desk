import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function getWeeklyReviews() {
  return prisma.weeklyReview.findMany({
    orderBy: { weekStart: "desc" },
  });
}

export function getWeeklyReviewById(id: string) {
  return prisma.weeklyReview.findUnique({ where: { id } });
}

export function createWeeklyReview(
  data: Prisma.WeeklyReviewUncheckedCreateInput,
) {
  return prisma.weeklyReview.create({ data });
}

export function updateWeeklyReview(
  id: string,
  data: Prisma.WeeklyReviewUncheckedUpdateInput,
) {
  return prisma.weeklyReview.update({
    where: { id },
    data,
  });
}

export function deleteWeeklyReview(id: string) {
  return prisma.weeklyReview.delete({ where: { id } });
}
