import { auth } from "@/auth";
import { ZodError } from "zod";

import {
  deleteMission,
  getMissionById,
  updateMission,
} from "@/db/queries/missions";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { updateMissionSchema } from "@/lib/validators";

type MissionRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: MissionRouteContext,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { id } = await params;
    const mission = await getMissionById(id, userId);

    if (!mission) {
      return errorResponse(
        "Mission not found",
        "MISSION_NOT_FOUND",
        404,
      );
    }

    return successResponse(mission, "Mission retrieved successfully");
  } catch {
    return errorResponse("Unable to retrieve mission");
  }
}

export async function PATCH(
  request: Request,
  { params }: MissionRouteContext,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { id } = await params;
    const input = updateMissionSchema.parse(await request.json());
    const existing = await getMissionById(id, userId);

    if (!existing) {
      return errorResponse(
        "Mission not found",
        "MISSION_NOT_FOUND",
        404,
      );
    }

    const mission = await updateMission(id, input, userId);
    return successResponse(mission, "Mission updated successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to update mission");
  }
}

export async function DELETE(
  _request: Request,
  { params }: MissionRouteContext,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { id } = await params;
    const existing = await getMissionById(id, userId);

    if (!existing) {
      return errorResponse(
        "Mission not found",
        "MISSION_NOT_FOUND",
        404,
      );
    }

    const mission = await deleteMission(id, userId);
    return successResponse(mission, "Mission deleted successfully");
  } catch {
    return errorResponse("Unable to delete mission");
  }
}
