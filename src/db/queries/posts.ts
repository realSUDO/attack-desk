import type { PostStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PostFilters = {
  status?: PostStatus;
  category?: string;
  canvasId?: string;
};

export function getPosts(filters: PostFilters = {}, userId: string) {
  return prisma.postIdea.findMany({
    where: { ...filters, userId },
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

export function getPostById(id: string, userId: string) {
  return prisma.postIdea.findUnique({
    where: { id, userId },
    include: { canvas: true },
  });
}

export function createPost(data: Prisma.PostIdeaUncheckedCreateInput) {
  return prisma.postIdea.create({ data });
}

export function updatePost(
  id: string,
  data: Prisma.PostIdeaUncheckedUpdateInput,
  userId: string,
) {
  return prisma.postIdea.update({
    where: { id, userId },
    data,
  });
}

export function deletePost(id: string, userId: string) {
  return prisma.postIdea.delete({ where: { id, userId } });
}
