"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import {
  createPost,
  deletePost,
  getPostById,
  updatePost,
} from "@/db/queries/posts";
import {
  getNullableFormString,
  getOptionalFormNumber,
  getOptionalFormString,
} from "@/lib/date";
import {
  type ActionResult,
  createPostSchema,
  updatePostSchema,
  validationFields,
} from "@/lib/validators";

function revalidatePostPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/post-lab");
  revalidatePath("/showcase");
}

function postFormData(formData: FormData) {
  return {
    title: getOptionalFormString(formData, "title"),
    hook: getNullableFormString(formData, "hook"),
    draft: getNullableFormString(formData, "draft"),
    finalContent: getNullableFormString(formData, "finalContent"),
    category: getNullableFormString(formData, "category"),
    status: getOptionalFormString(formData, "status"),
    postedUrl: getNullableFormString(formData, "postedUrl"),
    order: getOptionalFormNumber(formData, "order"),
    canvasId: getNullableFormString(formData, "canvasId"),
  };
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

export async function createPostAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = createPostSchema.parse(compact(postFormData(formData)));
    await createPost(input);
    revalidatePostPaths();

    return { success: true, message: "Post created successfully" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to create post" };
  }
}

export async function updatePostAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!(await getPostById(id))) {
      return { success: false, message: "Post not found" };
    }

    const input = updatePostSchema.parse(compact(postFormData(formData)));
    await updatePost(id, input);
    revalidatePostPaths();

    return { success: true, message: "Post updated successfully" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation failed",
        fields: validationFields(error),
      };
    }

    return { success: false, message: "Unable to update post" };
  }
}

export async function markPostReadyAction(
  id: string,
): Promise<ActionResult> {
  try {
    if (!(await getPostById(id))) {
      return { success: false, message: "Post not found" };
    }

    await updatePost(id, { status: "READY" });
    revalidatePostPaths();

    return { success: true, message: "Post marked ready" };
  } catch {
    return { success: false, message: "Unable to mark post ready" };
  }
}

export async function markPostPostedAction(
  id: string,
): Promise<ActionResult> {
  try {
    if (!(await getPostById(id))) {
      return { success: false, message: "Post not found" };
    }

    await updatePost(id, { status: "POSTED" });
    revalidatePostPaths();

    return { success: true, message: "Post marked posted" };
  } catch {
    return { success: false, message: "Unable to mark post posted" };
  }
}

export async function deletePostAction(
  id: string,
): Promise<ActionResult> {
  try {
    if (!(await getPostById(id))) {
      return { success: false, message: "Post not found" };
    }

    await deletePost(id);
    revalidatePostPaths();

    return { success: true, message: "Post deleted successfully" };
  } catch {
    return { success: false, message: "Unable to delete post" };
  }
}
