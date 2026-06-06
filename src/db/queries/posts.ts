import type { PostStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PostFilters = {
  status?: PostStatus;
  category?: string;
  canvasId?: string;
};

export function getPosts(filters: PostFilters = {}) {
  return prisma.postIdea.findMany({
    where: filters,
    orderBy: [
      { status: "asc" },
      { order: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

export function getPostById(id: string) {
  return prisma.postIdea.findUnique({
    where: { id },
    include: { canvas: true },
  });
}

export function createPost(data: Prisma.PostIdeaUncheckedCreateInput) {
  return prisma.postIdea.create({ data });
}

export function updatePost(
  id: string,
  data: Prisma.PostIdeaUncheckedUpdateInput,
) {
  return prisma.postIdea.update({
    where: { id },
    data,
  });
}

export function deletePost(id: string) {
  return prisma.postIdea.delete({ where: { id } });
}
