import { ZodError } from "zod";

import {
  createMission,
  getMissions,
} from "@/db/queries/missions";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import {
  createMissionSchema,
  missionFiltersSchema,
} from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = missionFiltersSchema.parse({
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      deadlineId: searchParams.get("deadlineId") || undefined,
      canvasId: searchParams.get("canvasId") || undefined,
    });
    const missions = await getMissions(filters);

    return successResponse(missions, "Missions retrieved successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return errorResponse("Unable to retrieve missions");
  }
}

export async function POST(request: Request) {
  try {
    const input = createMissionSchema.parse(await request.json());
    const mission = await createMission(input);

    return successResponse(
      mission,
      "Mission created successfully",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to create mission");
  }
}
