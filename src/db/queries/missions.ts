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

export function getMissions(filters: MissionFilters = {}) {
  return prisma.mission.findMany({
    where: filters,
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export function getMissionsWithRelations(filters: MissionFilters = {}) {
  return prisma.mission.findMany({
    where: filters,
    include: missionWithRelationsInclude,
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export function getMissionById(id: string) {
  return prisma.mission.findUnique({
    where: { id },
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
) {
  return prisma.mission.update({
    where: { id },
    data,
  });
}

export function deleteMission(id: string) {
  return prisma.mission.delete({ where: { id } });
}
