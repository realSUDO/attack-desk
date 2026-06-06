import { z } from "zod";

const missionStatuses = ["PLANNED", "DOING", "DONE"] as const;
const deadlineStatuses = ["ACTIVE", "COMPLETED", "MISSED"] as const;
const postStatuses = ["IDEA", "DRAFTING", "READY", "POSTED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const requiredTitle = z.string().trim().min(1, "Title is required");
const optionalText = z.string().trim().nullable().optional();
const dateStringToDate = z
  .string()
  .datetime({ message: "Must be a valid ISO date string" })
  .transform((value) => new Date(value));

const nonEmptyUpdate = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    });

export const missionFiltersSchema = z.object({
  status: z.enum(missionStatuses).optional(),
  priority: z.enum(priorities).optional(),
  deadlineId: z.string().min(1).optional(),
  canvasId: z.string().min(1).optional(),
});

export const createMissionSchema = z
  .object({
    title: requiredTitle,
    description: optionalText,
    status: z.enum(missionStatuses).optional(),
    priority: z.enum(priorities).optional(),
    category: optionalText,
    dueDate: dateStringToDate.nullable().optional(),
    order: z.number().int().optional(),
    deadlineId: z.string().min(1).nullable().optional(),
    canvasId: z.string().min(1).nullable().optional(),
  })
  .strict();

export const updateMissionSchema = nonEmptyUpdate({
  title: requiredTitle.optional(),
  description: optionalText,
  status: z.enum(missionStatuses).optional(),
  priority: z.enum(priorities).optional(),
  category: optionalText,
  dueDate: dateStringToDate.nullable().optional(),
  order: z.number().int().optional(),
  deadlineId: z.string().min(1).nullable().optional(),
  canvasId: z.string().min(1).nullable().optional(),
});

export const deadlineFiltersSchema = z.object({
  status: z.enum(deadlineStatuses).optional(),
  priority: z.enum(priorities).optional(),
  category: z.string().trim().min(1).optional(),
});

export const createDeadlineSchema = z
  .object({
    title: requiredTitle,
    description: optionalText,
    dueDate: dateStringToDate,
    category: optionalText,
    status: z.enum(deadlineStatuses).optional(),
    priority: z.enum(priorities).optional(),
    link: z.url("Link must be a valid URL").nullable().optional(),
  })
  .strict();

export const updateDeadlineSchema = nonEmptyUpdate({
  title: requiredTitle.optional(),
  description: optionalText,
  dueDate: dateStringToDate.optional(),
  category: optionalText,
  status: z.enum(deadlineStatuses).optional(),
  priority: z.enum(priorities).optional(),
  link: z.url("Link must be a valid URL").nullable().optional(),
});

export const postFiltersSchema = z.object({
  status: z.enum(postStatuses).optional(),
  category: z.string().trim().min(1).optional(),
  canvasId: z.string().min(1).optional(),
});

export const createPostSchema = z
  .object({
    title: requiredTitle,
    hook: optionalText,
    draft: optionalText,
    finalContent: optionalText,
    category: optionalText,
    status: z.enum(postStatuses).optional(),
    postedUrl: z.url("Posted URL must be a valid URL").nullable().optional(),
    order: z.number().int().optional(),
    canvasId: z.string().min(1).nullable().optional(),
  })
  .strict();

export const updatePostSchema = nonEmptyUpdate({
  title: requiredTitle.optional(),
  hook: optionalText,
  draft: optionalText,
  finalContent: optionalText,
  category: optionalText,
  status: z.enum(postStatuses).optional(),
  postedUrl: z.url("Posted URL must be a valid URL").nullable().optional(),
  order: z.number().int().optional(),
  canvasId: z.string().min(1).nullable().optional(),
});

export const createCanvasSchema = z
  .object({
    title: requiredTitle,
    description: optionalText,
    data: z.unknown().optional().nullable(),
    thumbnail: optionalText,
    deadlineId: z.string().min(1).nullable().optional(),
  })
  .strict();

export const updateCanvasSchema = nonEmptyUpdate({
  title: requiredTitle.optional(),
  description: optionalText,
  data: z.unknown().optional().nullable(),
  thumbnail: optionalText,
  deadlineId: z.string().min(1).nullable().optional(),
});

export const createWeeklyReviewSchema = z
  .object({
    weekStart: dateStringToDate,
    weekEnd: dateStringToDate,
    wentRight: optionalText,
    wentWrong: optionalText,
    nextPlan: optionalText,
    finalNote: optionalText,
  })
  .strict()
  .refine((value) => value.weekEnd >= value.weekStart, {
    message: "Week end must be on or after week start",
    path: ["weekEnd"],
  });

export const updateWeeklyReviewSchema = nonEmptyUpdate({
  weekStart: dateStringToDate.optional(),
  weekEnd: dateStringToDate.optional(),
  wentRight: optionalText,
  wentWrong: optionalText,
  nextPlan: optionalText,
  finalNote: optionalText,
});

export type ActionResult<T = null> = {
  success: boolean;
  message: string;
  data?: T;
  fields?: Record<string, string>;
};

export function validationFields(error: z.ZodError) {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    fields[issue.path.join(".") || "form"] = issue.message;
  }

  return fields;
}
