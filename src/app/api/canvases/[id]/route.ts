import { ZodError } from "zod";

import {
  canvasExists,
  deleteCanvas,
  getCanvasById,
  updateCanvas,
} from "@/db/queries/canvases";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { updateCanvasSchema } from "@/lib/validators";

type CanvasRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: CanvasRouteContext,
) {
  try {
    const { id } = await params;
    const canvas = await getCanvasById(id);

    if (!canvas) {
      return errorResponse(
        "Canvas not found",
        "CANVAS_NOT_FOUND",
        404,
      );
    }

    return successResponse(canvas, "Canvas retrieved successfully");
  } catch {
    return errorResponse("Unable to retrieve canvas");
  }
}

export async function PATCH(
  request: Request,
  { params }: CanvasRouteContext,
) {
  try {
    const { id } = await params;
    const input = updateCanvasSchema.parse(await request.json());
    const existing = await canvasExists(id);

    if (!existing) {
      return errorResponse(
        "Canvas not found",
        "CANVAS_NOT_FOUND",
        404,
      );
    }

    const canvas = await updateCanvas(id, input);
    if (request.headers.get("prefer") === "return=minimal") {
      return new Response(null, { status: 204 });
    }
    return successResponse(canvas, "Canvas updated successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to update canvas");
  }
}

export async function DELETE(
  _request: Request,
  { params }: CanvasRouteContext,
) {
  try {
    const { id } = await params;
    const existing = await getCanvasById(id);

    if (!existing) {
      return errorResponse(
        "Canvas not found",
        "CANVAS_NOT_FOUND",
        404,
      );
    }

    const canvas = await deleteCanvas(id);
    return successResponse(canvas, "Canvas deleted successfully");
  } catch {
    return errorResponse("Unable to delete canvas");
  }
}
