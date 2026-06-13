import { z } from "zod";

import {
  FEEDBACK_TYPES,
  type FeedbackItem,
  type FeedbackItemType,
  type FeedbackSubmission,
  UNCATEGORIZED_FEEDBACK_TYPE,
} from "./feedback-types";

export * from "./feedback-types";

export type FeedbackValidationResult =
  | { ok: true; submission: FeedbackSubmission }
  | { ok: false; errors: string[] };

const feedbackTypeSet = new Set<string>(FEEDBACK_TYPES);
const imageTypeSet = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const maxImageBytes = 5 * 1024 * 1024;

const optionalTrimmedStringSchema = z.string().trim().optional();

const reporterIdentitySchema = z
  .object({
    id: optionalTrimmedStringSchema,
    email: optionalTrimmedStringSchema,
    name: optionalTrimmedStringSchema,
  })
  .strict();

const pageContextSchema = z
  .object({
    url: optionalTrimmedStringSchema,
    title: optionalTrimmedStringSchema,
    userAgent: optionalTrimmedStringSchema,
    timestamp: optionalTrimmedStringSchema,
    viewport: z
      .object({
        width: z.number().finite(),
        height: z.number().finite(),
      })
      .strict()
      .optional(),
  })
  .strict();

const screenshotSchema = z
  .object({
    dataUrl: z
      .string()
      .trim()
      .min(1, "screenshot.dataUrl is required when screenshot is provided."),
    capturedAt: z
      .string()
      .trim()
      .min(1, "screenshot.capturedAt is required when screenshot is provided."),
    width: z.number().finite().optional(),
    height: z.number().finite().optional(),
  })
  .strict();

const selectedElementSchema = z
  .object({
    tagName: z
      .string()
      .trim()
      .min(
        1,
        "selectedElement.tagName is required when selectedElement is provided.",
      ),
    label: optionalTrimmedStringSchema,
    selectorPath: optionalTrimmedStringSchema,
    boundingBox: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().finite(),
        height: z.number().finite(),
      })
      .strict()
      .optional(),
    highlightContext: optionalTrimmedStringSchema,
  })
  .strict();

export const feedbackSubmissionSchema = z
  .object({
    clientKey: z.string().trim().min(1, "clientKey is required."),
    content: z.string().trim().min(1, "content is required."),
    type: z.string().trim().optional(),
    reporterIdentity: reporterIdentitySchema.optional(),
    pageContext: pageContextSchema.optional(),
    screenshot: screenshotSchema.nullish(),
    selectedElement: selectedElementSchema.nullish(),
    uploadedImages: z
      .array(
        z
          .object({
            name: z
              .string()
              .trim()
              .min(1, "uploadedImages[].name is required."),
            type: z
              .string()
              .trim()
              .refine(
                (type) => imageTypeSet.has(type),
                "uploadedImages[].type must be a supported web image type.",
              ),
            size: z
              .number()
              .finite()
              .positive("uploadedImages[].size must be a positive number.")
              .max(
                maxImageBytes,
                "uploadedImages[].size must be 5 MB or smaller.",
              ),
            dataUrl: z
              .string()
              .trim()
              .min(1, "uploadedImages[].dataUrl is required."),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((submission, context) => {
    if (submission.type && !feedbackTypeSet.has(submission.type)) {
      context.addIssue({
        code: "custom",
        path: ["type"],
        message: "type must be one of the supported Feedback Types.",
      });
    }
  })
  .transform((submission) => ({
    ...submission,
    type: submission.type as FeedbackSubmission["type"],
  }));

export function normalizeFeedbackType(
  type: FeedbackSubmission["type"],
): FeedbackItemType {
  return type && feedbackTypeSet.has(type) ? type : UNCATEGORIZED_FEEDBACK_TYPE;
}

export function validateFeedbackSubmission(
  input: unknown,
): FeedbackValidationResult {
  const result = feedbackSubmissionSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }

  return { ok: true, submission: result.data };
}

export function createFeedbackItem(
  submission: FeedbackSubmission,
): FeedbackItem {
  return {
    id: crypto.randomUUID(),
    clientKey: submission.clientKey,
    content: submission.content,
    type: normalizeFeedbackType(submission.type),
    reporterIdentity: submission.reporterIdentity,
    pageContext: submission.pageContext,
    screenshot: submission.screenshot ?? null,
    selectedElement: submission.selectedElement ?? null,
    uploadedImages: submission.uploadedImages ?? [],
    submittedAt: new Date().toISOString(),
  };
}
