import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  createVerificationToken,
} from "@/lib/verification-token";
import { sendVerificationEmail } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      return errorResponse(
        "An account with this email already exists",
        "EMAIL_EXISTS",
        409,
      );
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        hashedPassword,
      },
    });

    const token = await createVerificationToken(input.email);
    await sendVerificationEmail(input.email, input.name, token);

    return successResponse(
      null,
      "Account created. Check your email to verify your account.",
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: "Validation failed",
          error: {
            code: "VALIDATION_ERROR",
            fields: Object.fromEntries(
              error.issues.map((issue) => [
                issue.path.join(".") || "form",
                issue.message,
              ]),
            ),
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
    }

    return errorResponse("Unable to create account");
  }
}
