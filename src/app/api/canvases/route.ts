import { auth } from "@/auth";
import { ZodError } from "zod";

import {
  createCanvas,
  getCanvases,
} from "@/db/queries/canvases";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { createCanvasSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const canvases = await getCanvases(userId);
    return successResponse(canvases, "Canvases retrieved successfully");
  } catch {
    return errorResponse("Unable to retrieve canvases");
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const input = createCanvasSchema.parse(await request.json());
    const canvas = await createCanvas({ ...input, userId });

    return successResponse(
      canvas,
      "Canvas created successfully",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to create canvas");
  }
}
