import type {
  DeadlineStatus,
  Prisma,
  Priority,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type DeadlineFilters = {
  status?: DeadlineStatus;
  priority?: Priority;
  category?: string;
};

export function getDeadlines(filters: DeadlineFilters = {}, userId: string) {
  return prisma.deadline.findMany({
    where: { ...filters, userId },
    orderBy: { dueDate: "asc" },
  });
}

export function getDeadlineById(id: string, userId: string) {
  return prisma.deadline.findUnique({
    where: { id, userId },
    include: {
      missions: true,
      canvases: true,
    },
  });
}

export function createDeadline(data: Prisma.DeadlineUncheckedCreateInput) {
  return prisma.deadline.create({ data });
}

export function updateDeadline(
  id: string,
  data: Prisma.DeadlineUncheckedUpdateInput,
  userId: string,
) {
  return prisma.deadline.update({
    where: { id, userId },
    data,
  });
}

export function deleteDeadline(id: string, userId: string) {
  return prisma.deadline.delete({ where: { id, userId } });
}
