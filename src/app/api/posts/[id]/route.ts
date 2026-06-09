import { auth } from "@/auth";
import { ZodError } from "zod";

import {
  deletePost,
  getPostById,
  updatePost,
} from "@/db/queries/posts";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { updatePostSchema } from "@/lib/validators";

type PostRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: PostRouteContext,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { id } = await params;
    const post = await getPostById(id, userId);

    if (!post) {
      return errorResponse("Post not found", "POST_NOT_FOUND", 404);
    }

    return successResponse(post, "Post retrieved successfully");
  } catch {
    return errorResponse("Unable to retrieve post");
  }
}

export async function PATCH(
  request: Request,
  { params }: PostRouteContext,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { id } = await params;
    const input = updatePostSchema.parse(await request.json());
    const existing = await getPostById(id, userId);

    if (!existing) {
      return errorResponse("Post not found", "POST_NOT_FOUND", 404);
    }

    const post = await updatePost(id, input, userId);
    return successResponse(post, "Post updated successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to update post");
  }
}

export async function DELETE(
  _request: Request,
  { params }: PostRouteContext,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { id } = await params;
    const existing = await getPostById(id, userId);

    if (!existing) {
      return errorResponse("Post not found", "POST_NOT_FOUND", 404);
    }

    const post = await deletePost(id, userId);
    return successResponse(post, "Post deleted successfully");
  } catch {
    return errorResponse("Unable to delete post");
  }
}
