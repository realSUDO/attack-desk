import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(
  data: T,
  message = "Success",
  status = 200,
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status },
  );
}

export function errorResponse(
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  status = 500,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
      },
    },
    { status },
  );
}

export function validationErrorResponse(error: ZodError) {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = issue.message;
  }

  return NextResponse.json(
    {
      success: false,
      message: "Validation failed",
      error: {
        code: "VALIDATION_ERROR",
        fields,
      },
    },
    { status: 400 },
  );
}
