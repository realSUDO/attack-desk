"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { auth } from "@/auth";

import {
  createDeadline,
  deleteDeadline,
  getDeadlineById,
  updateDeadline,
} from "@/db/queries/deadlines";
import {
  getNullableFormString,
  getOptionalFormString,
} from "@/lib/date";
import {
  type ActionResult,
  createDeadlineSchema,
  updateDeadlineSchema,
  validationFields,
} from "@/lib/validators";

function revalidateDeadlinePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/board");
  revalidatePath("/showcase");
}

function deadlineFormData(formData: FormData) {
  return {
    title: getOptionalFormString(formData, "title"),
    description: getNullableFormString(formData, "description"),
    dueDate: getOptionalFormString(formData, "dueDate"),
    category: getNullableFormString(formData, "category"),
    status: getOptionalFormString(formData, "status"),
    priority: getOptionalFormString(formData, "priority"),
    link: getNullableFormString(formData, "link"),
  };
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

export async function createDeadlineAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const input = createDeadlineSchema.parse(
      compact(deadlineFormData(formData)),
    );
    await createDeadline({ ...input, userId });
    revalidateDeadlinePaths();

    return {
      success: true,
      message: "Deadline created successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to create deadline" };
  }
}

export async function updateDeadlineAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getDeadlineById(id, userId))) {
      return { success: false, message: "Deadline not found" };
    }

    const input = updateDeadlineSchema.parse(
      compact(deadlineFormData(formData)),
    );
    await updateDeadline(id, input, userId);
    revalidateDeadlinePaths();

    return {
      success: true,
      message: "Deadline updated successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to update deadline" };
  }
}

export async function completeDeadlineAction(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getDeadlineById(id, userId))) {
      return { success: false, message: "Deadline not found" };
    }

    await updateDeadline(id, { status: "COMPLETED" }, userId);
    revalidateDeadlinePaths();

    return {
      success: true,
      message: "Deadline completed successfully",
    };
  } catch {
    return { success: false, message: "Unable to complete deadline" };
  }
}

export async function deleteDeadlineAction(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getDeadlineById(id, userId))) {
      return { success: false, message: "Deadline not found" };
    }

    await deleteDeadline(id, userId);
    revalidateDeadlinePaths();

    return {
      success: true,
      message: "Deadline deleted successfully",
    };
  } catch {
    return { success: false, message: "Unable to delete deadline" };
  }
}
