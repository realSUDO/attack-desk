import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CanvasInput = Omit<
  Prisma.CanvasUncheckedCreateInput,
  "data"
> & {
  data?: unknown;
};

type CanvasUpdateInput = Omit<
  Prisma.CanvasUncheckedUpdateInput,
  "data"
> & {
  data?: unknown;
};

function normalizeJson(data: unknown) {
  if (data === null) {
    return Prisma.DbNull;
  }

  return data as Prisma.InputJsonValue;
}

export function getCanvases(userId: string) {
  return prisma.canvas.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          missions: true,
          postIdeas: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getCanvasById(id: string, userId: string) {
  return prisma.canvas.findUnique({
    where: { id, userId },
    include: {
      deadline: true,
      missions: true,
      postIdeas: true,
    },
  });
}

export function canvasExists(id: string, userId: string) {
  return prisma.canvas.findUnique({
    where: { id, userId },
    select: { id: true },
  });
}

export function createCanvas({ data, ...rest }: CanvasInput) {
  return prisma.canvas.create({
    data: {
      ...rest,
      ...(data !== undefined ? { data: normalizeJson(data) } : {}),
    },
  });
}

export function updateCanvas(
  id: string,
  { data, ...rest }: CanvasUpdateInput,
  userId: string,
) {
  return prisma.canvas.update({
    where: { id, userId },
    data: {
      ...rest,
      ...(data !== undefined ? { data: normalizeJson(data) } : {}),
    },
  });
}

export function deleteCanvas(id: string, userId: string) {
  return prisma.canvas.delete({ where: { id, userId } });
}
