"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import {
  createCanvas,
  deleteCanvas,
  getCanvasById,
  updateCanvas,
} from "@/db/queries/canvases";
import {
  getNullableFormString,
  getOptionalFormJson,
  getOptionalFormString,
} from "@/lib/date";
import {
  type ActionResult,
  createCanvasSchema,
  updateCanvasSchema,
  validationFields,
} from "@/lib/validators";

function revalidateCanvasPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/canvas");
  revalidatePath("/showcase");
}

export async function createCanvasAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = createCanvasSchema.parse({
      title: getOptionalFormString(formData, "title"),
      description: getNullableFormString(formData, "description"),
      data: getOptionalFormJson(formData, "data"),
      thumbnail: getNullableFormString(formData, "thumbnail"),
      deadlineId: getNullableFormString(formData, "deadlineId"),
    });
    await createCanvas(input);
    revalidateCanvasPaths();

    return { success: true, message: "Canvas created successfully" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    if (error instanceof SyntaxError) {
      return { success: false, message: "Canvas data must be valid JSON" };
    }

    return { success: false, message: "Unable to create canvas" };
  }
}

export async function updateCanvasTitleAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!(await getCanvasById(id))) {
      return { success: false, message: "Canvas not found" };
    }

    const input = updateCanvasSchema.parse({
      title: getOptionalFormString(formData, "title"),
    });
    await updateCanvas(id, input);
    revalidateCanvasPaths();

    return {
      success: true,
      message: "Canvas title updated successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to update canvas title" };
  }
}

export async function deleteCanvasAction(
  id: string,
): Promise<ActionResult> {
  try {
    if (!(await getCanvasById(id))) {
      return { success: false, message: "Canvas not found" };
    }

    await deleteCanvas(id);
    revalidateCanvasPaths();

    return { success: true, message: "Canvas deleted successfully" };
  } catch {
    return { success: false, message: "Unable to delete canvas" };
  }
}
