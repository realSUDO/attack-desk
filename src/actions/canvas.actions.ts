"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import {
  createCanvas,
  deleteCanvas,
  getCanvasById,
  updateCanvas,
} from "@/db/queries/canvases";
import { getMissionById, updateMission } from "@/db/queries/missions";
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
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = createCanvasSchema.parse({
      title: getOptionalFormString(formData, "title"),
      description: getNullableFormString(formData, "description"),
      data: getOptionalFormJson(formData, "data"),
      thumbnail: getNullableFormString(formData, "thumbnail"),
      deadlineId: getNullableFormString(formData, "deadlineId"),
    });
    const created = await createCanvas(input);
    revalidateCanvasPaths();

    return {
      success: true,
      message: "Canvas created successfully",
      data: { id: created.id },
    };
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

export async function saveCanvasAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const existing = await getCanvasById(id);
    if (!existing) {
      return { success: false, message: "Canvas not found" };
    }

    const title = getOptionalFormString(formData, "title");
    const rawData = getOptionalFormJson(formData, "data");

    await updateCanvas(id, {
      ...(title ? { title } : {}),
      ...(rawData !== undefined ? { data: rawData } : {}),
    });
    revalidateCanvasPaths();

    return { success: true, message: "Canvas saved" };
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

    return { success: false, message: "Unable to save canvas" };
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

export async function linkMissionToCanvasAction(
  canvasId: string,
  missionId: string,
): Promise<ActionResult> {
  try {
    if (!(await getCanvasById(canvasId))) {
      return { success: false, message: "Canvas not found" };
    }
    if (!(await getMissionById(missionId))) {
      return { success: false, message: "Mission not found" };
    }
    await updateMission(missionId, { canvasId });
    revalidateCanvasPaths();
    revalidatePath(`/canvas/${canvasId}`);

    return { success: true, message: "Mission linked to canvas" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }
    return { success: false, message: "Unable to link mission" };
  }
}

export async function unlinkMissionFromCanvasAction(
  canvasId: string,
  missionId: string,
): Promise<ActionResult> {
  try {
    if (!(await getMissionById(missionId))) {
      return { success: false, message: "Mission not found" };
    }
    await updateMission(missionId, { canvasId: null });
    revalidateCanvasPaths();
    revalidatePath(`/canvas/${canvasId}`);

    return { success: true, message: "Mission unlinked from canvas" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }
    return { success: false, message: "Unable to unlink mission" };
  }
}
