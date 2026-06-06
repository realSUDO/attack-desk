import { ZodError } from "zod";

import {
  deleteWeeklyReview,
  getWeeklyReviewById,
  updateWeeklyReview,
} from "@/db/queries/weekly-reviews";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { updateWeeklyReviewSchema } from "@/lib/validators";

type WeeklyReviewRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: WeeklyReviewRouteContext,
) {
  try {
    const { id } = await params;
    const review = await getWeeklyReviewById(id);

    if (!review) {
      return errorResponse(
        "Weekly review not found",
        "WEEKLY_REVIEW_NOT_FOUND",
        404,
      );
    }

    return successResponse(
      review,
      "Weekly review retrieved successfully",
    );
  } catch {
    return errorResponse("Unable to retrieve weekly review");
  }
}

export async function PATCH(
  request: Request,
  { params }: WeeklyReviewRouteContext,
) {
  try {
    const { id } = await params;
    const input = updateWeeklyReviewSchema.parse(await request.json());
    const existing = await getWeeklyReviewById(id);

    if (!existing) {
      return errorResponse(
        "Weekly review not found",
        "WEEKLY_REVIEW_NOT_FOUND",
        404,
      );
    }

    const review = await updateWeeklyReview(id, input);
    return successResponse(
      review,
      "Weekly review updated successfully",
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to update weekly review");
  }
}

export async function DELETE(
  _request: Request,
  { params }: WeeklyReviewRouteContext,
) {
  try {
    const { id } = await params;
    const existing = await getWeeklyReviewById(id);

    if (!existing) {
      return errorResponse(
        "Weekly review not found",
        "WEEKLY_REVIEW_NOT_FOUND",
        404,
      );
    }

    const review = await deleteWeeklyReview(id);
    return successResponse(
      review,
      "Weekly review deleted successfully",
    );
  } catch {
    return errorResponse("Unable to delete weekly review");
  }
}
