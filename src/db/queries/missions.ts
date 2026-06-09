import type {
  MissionStatus,
  Prisma,
  Priority,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type MissionFilters = {
  status?: MissionStatus;
  priority?: Priority;
  deadlineId?: string;
  canvasId?: string;
};

export const missionWithRelationsInclude = {
  deadline: { select: { id: true, title: true, dueDate: true } },
  canvas: { select: { id: true, title: true } },
} satisfies Prisma.MissionInclude;

export type MissionWithRelations = Prisma.MissionGetPayload<{
  include: typeof missionWithRelationsInclude;
}>;

export function getMissions(filters: MissionFilters = {}, userId: string) {
  return prisma.mission.findMany({
    where: { ...filters, userId },
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export function getMissionsWithRelations(filters: MissionFilters = {}, userId: string) {
  return prisma.mission.findMany({
    where: { ...filters, userId },
    include: missionWithRelationsInclude,
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export function getMissionById(id: string, userId: string) {
  return prisma.mission.findUnique({
    where: { id, userId },
    include: {
      deadline: true,
      canvas: true,
    },
  });
}

export function createMission(data: Prisma.MissionUncheckedCreateInput) {
  return prisma.mission.create({ data });
}

export function updateMission(
  id: string,
  data: Prisma.MissionUncheckedUpdateInput,
  userId: string,
) {
  return prisma.mission.update({
    where: { id, userId },
    data,
  });
}

export function deleteMission(id: string, userId: string) {
  return prisma.mission.delete({ where: { id, userId } });
}
