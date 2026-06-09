"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { auth } from "@/auth";

import {
  createWeeklyReview,
  deleteWeeklyReview,
  getWeeklyReviewById,
  updateWeeklyReview,
} from "@/db/queries/weekly-reviews";
import {
  getNullableFormString,
  getOptionalFormString,
} from "@/lib/date";
import {
  type ActionResult,
  createWeeklyReviewSchema,
  updateWeeklyReviewSchema,
  validationFields,
} from "@/lib/validators";

function revalidateWeeklyReviewPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/weekly-review");
}

function reviewFormData(formData: FormData) {
  return {
    weekStart: getOptionalFormString(formData, "weekStart"),
    weekEnd: getOptionalFormString(formData, "weekEnd"),
    wentRight: getNullableFormString(formData, "wentRight"),
    wentWrong: getNullableFormString(formData, "wentWrong"),
    nextPlan: getNullableFormString(formData, "nextPlan"),
    finalNote: getNullableFormString(formData, "finalNote"),
  };
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

export async function createWeeklyReviewAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const input = createWeeklyReviewSchema.parse(
      compact(reviewFormData(formData)),
    );
    await createWeeklyReview({ ...input, userId });
    revalidateWeeklyReviewPaths();

    return {
      success: true,
      message: "Weekly review created successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to create weekly review" };
  }
}

export async function updateWeeklyReviewAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getWeeklyReviewById(id, userId))) {
      return { success: false, message: "Weekly review not found" };
    }

    const input = updateWeeklyReviewSchema.parse(
      compact(reviewFormData(formData)),
    );
    await updateWeeklyReview(id, input, userId);
    revalidateWeeklyReviewPaths();

    return {
      success: true,
      message: "Weekly review updated successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to update weekly review" };
  }
}

export async function deleteWeeklyReviewAction(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getWeeklyReviewById(id, userId))) {
      return { success: false, message: "Weekly review not found" };
    }

    await deleteWeeklyReview(id, userId);
    revalidateWeeklyReviewPaths();

    return {
      success: true,
      message: "Weekly review deleted successfully",
    };
  } catch {
    return { success: false, message: "Unable to delete weekly review" };
  }
}
