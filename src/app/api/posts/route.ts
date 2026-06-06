import { ZodError } from "zod";

import { createPost, getPosts } from "@/db/queries/posts";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import {
  createPostSchema,
  postFiltersSchema,
} from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = postFiltersSchema.parse({
      status: searchParams.get("status") || undefined,
      category: searchParams.get("category") || undefined,
      canvasId: searchParams.get("canvasId") || undefined,
    });
    const posts = await getPosts(filters);

    return successResponse(posts, "Posts retrieved successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return errorResponse("Unable to retrieve posts");
  }
}

export async function POST(request: Request) {
  try {
    const input = createPostSchema.parse(await request.json());
    const post = await createPost(input);

    return successResponse(post, "Post created successfully", 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to create post");
  }
}
