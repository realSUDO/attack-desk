import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { verifyEmailToken } from "@/lib/verification-token";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return errorResponse("Token is required", "MISSING_TOKEN", 400);
    }

    const userId = await verifyEmailToken(token);

    if (!userId) {
      return errorResponse(
        "Invalid or expired verification token",
        "INVALID_TOKEN",
        400,
      );
    }

    return successResponse(null, "Email verified successfully");
  } catch {
    return errorResponse("Unable to verify email");
  }
}
