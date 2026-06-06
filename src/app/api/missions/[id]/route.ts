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
    const { id } = await params;
    const mission = await getMissionById(id);

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
    const { id } = await params;
    const input = updateMissionSchema.parse(await request.json());
    const existing = await getMissionById(id);

    if (!existing) {
      return errorResponse(
        "Mission not found",
        "MISSION_NOT_FOUND",
        404,
      );
    }

    const mission = await updateMission(id, input);
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
    const { id } = await params;
    const existing = await getMissionById(id);

    if (!existing) {
      return errorResponse(
        "Mission not found",
        "MISSION_NOT_FOUND",
        404,
      );
    }

    const mission = await deleteMission(id);
    return successResponse(mission, "Mission deleted successfully");
  } catch {
    return errorResponse("Unable to delete mission");
  }
}
