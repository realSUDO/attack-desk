import { ZodError } from "zod";

import {
  deleteDeadline,
  getDeadlineById,
  updateDeadline,
} from "@/db/queries/deadlines";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { updateDeadlineSchema } from "@/lib/validators";

type DeadlineRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: DeadlineRouteContext,
) {
  try {
    const { id } = await params;
    const deadline = await getDeadlineById(id);

    if (!deadline) {
      return errorResponse(
        "Deadline not found",
        "DEADLINE_NOT_FOUND",
        404,
      );
    }

    return successResponse(deadline, "Deadline retrieved successfully");
  } catch {
    return errorResponse("Unable to retrieve deadline");
  }
}

export async function PATCH(
  request: Request,
  { params }: DeadlineRouteContext,
) {
  try {
    const { id } = await params;
    const input = updateDeadlineSchema.parse(await request.json());
    const existing = await getDeadlineById(id);

    if (!existing) {
      return errorResponse(
        "Deadline not found",
        "DEADLINE_NOT_FOUND",
        404,
      );
    }

    const deadline = await updateDeadline(id, input);
    return successResponse(deadline, "Deadline updated successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to update deadline");
  }
}

export async function DELETE(
  _request: Request,
  { params }: DeadlineRouteContext,
) {
  try {
    const { id } = await params;
    const existing = await getDeadlineById(id);

    if (!existing) {
      return errorResponse(
        "Deadline not found",
        "DEADLINE_NOT_FOUND",
        404,
      );
    }

    const deadline = await deleteDeadline(id);
    return successResponse(deadline, "Deadline deleted successfully");
  } catch {
    return errorResponse("Unable to delete deadline");
  }
}
