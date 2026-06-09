"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { auth } from "@/auth";

import {
  createMission,
  deleteMission,
  getMissionById,
  updateMission,
} from "@/db/queries/missions";
import {
  getNullableFormString,
  getOptionalFormNumber,
  getOptionalFormString,
} from "@/lib/date";
import {
  type ActionResult,
  createMissionSchema,
  updateMissionSchema,
  validationFields,
} from "@/lib/validators";

function revalidateMissionPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/board");
  revalidatePath("/showcase");
}

function missionFormData(formData: FormData) {
  return {
    title: getOptionalFormString(formData, "title"),
    description: getNullableFormString(formData, "description"),
    status: getOptionalFormString(formData, "status"),
    priority: getOptionalFormString(formData, "priority"),
    category: getNullableFormString(formData, "category"),
    dueDate: getNullableFormString(formData, "dueDate"),
    order: getOptionalFormNumber(formData, "order"),
    deadlineId: getNullableFormString(formData, "deadlineId"),
    canvasId: getNullableFormString(formData, "canvasId"),
  };
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

export async function createMissionAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const input = createMissionSchema.parse(compact(missionFormData(formData)));
    await createMission({ ...input, userId });
    revalidateMissionPaths();

    return {
      success: true,
      message: "Mission created successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to create mission" };
  }
}

export async function updateMissionAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getMissionById(id, userId))) {
      return { success: false, message: "Mission not found" };
    }

    const input = updateMissionSchema.parse(compact(missionFormData(formData)));
    await updateMission(id, input, userId);
    revalidateMissionPaths();

    return {
      success: true,
      message: "Mission updated successfully",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to update mission" };
  }
}

export async function completeMissionAction(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getMissionById(id, userId))) {
      return { success: false, message: "Mission not found" };
    }

    await updateMission(id, { status: "DONE" }, userId);
    revalidateMissionPaths();

    return {
      success: true,
      message: "Mission completed successfully",
    };
  } catch {
    return { success: false, message: "Unable to complete mission" };
  }
}

export async function deleteMissionAction(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    if (!(await getMissionById(id, userId))) {
      return { success: false, message: "Mission not found" };
    }

    await deleteMission(id, userId);
    revalidateMissionPaths();

    return {
      success: true,
      message: "Mission deleted successfully",
    };
  } catch {
    return { success: false, message: "Unable to delete mission" };
  }
}
