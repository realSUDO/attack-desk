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

export function getCanvases() {
  return prisma.canvas.findMany({
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

export function getCanvasById(id: string) {
  return prisma.canvas.findUnique({
    where: { id },
    include: {
      deadline: true,
      missions: true,
      postIdeas: true,
    },
  });
}

export function canvasExists(id: string) {
  return prisma.canvas.findUnique({
    where: { id },
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
) {
  return prisma.canvas.update({
    where: { id },
    data: {
      ...rest,
      ...(data !== undefined ? { data: normalizeJson(data) } : {}),
    },
  });
}

export function deleteCanvas(id: string) {
  return prisma.canvas.delete({ where: { id } });
}
