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

export function getDeadlines(filters: DeadlineFilters = {}) {
  return prisma.deadline.findMany({
    where: filters,
    orderBy: { dueDate: "asc" },
  });
}

export function getDeadlineById(id: string) {
  return prisma.deadline.findUnique({
    where: { id },
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
) {
  return prisma.deadline.update({
    where: { id },
    data,
  });
}

export function deleteDeadline(id: string) {
  return prisma.deadline.delete({ where: { id } });
}
