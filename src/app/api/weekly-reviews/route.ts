import { auth } from "@/auth";
import { ZodError } from "zod";

import {
  createWeeklyReview,
  getWeeklyReviews,
} from "@/db/queries/weekly-reviews";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { createWeeklyReviewSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const reviews = await getWeeklyReviews(userId);
    return successResponse(
      reviews,
      "Weekly reviews retrieved successfully",
    );
  } catch {
    return errorResponse("Unable to retrieve weekly reviews");
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const input = createWeeklyReviewSchema.parse(await request.json());
    const review = await createWeeklyReview({ ...input, userId });

    return successResponse(
      review,
      "Weekly review created successfully",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to create weekly review");
  }
}
