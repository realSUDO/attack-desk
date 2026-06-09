import { auth } from "@/auth";
import { ZodError } from "zod";

import {
  createDeadline,
  getDeadlines,
} from "@/db/queries/deadlines";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import {
  createDeadlineSchema,
  deadlineFiltersSchema,
} from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const searchParams = new URL(request.url).searchParams;
    const filters = deadlineFiltersSchema.parse({
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      category: searchParams.get("category") || undefined,
    });
    const deadlines = await getDeadlines(filters, userId);

    return successResponse(
      deadlines,
      "Deadlines retrieved successfully",
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return errorResponse("Unable to retrieve deadlines");
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const input = createDeadlineSchema.parse(await request.json());
    const deadline = await createDeadline({ ...input, userId });

    return successResponse(
      deadline,
      "Deadline created successfully",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to create deadline");
  }
}
