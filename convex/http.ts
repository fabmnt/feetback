import type { FunctionArgs } from "convex/server";
import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";

import {
  type FeedbackSubmission,
  normalizeFeedbackType,
  validateFeedbackSubmission,
} from "../src/lib/feedback-contract";
import type { ScreenshotAttachment } from "../src/lib/feedback-types";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, httpAction } from "./_generated/server";

type SubmitArgs = FunctionArgs<typeof internal.feedback.submit>;
type StorageScreenshot = NonNullable<SubmitArgs["screenshot"]>;
type StorageUploadedImage = NonNullable<SubmitArgs["uploadedImages"]>[number];

const STORAGE_UNAVAILABLE_MESSAGE =
  "Feedback could not be saved. Please try again.";
const RATE_LIMIT_MESSAGE =
  "Too many feedback submissions. Please try again later.";

const http = httpRouter();

http.route({
  path: "/api/feedback",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request.headers.get("origin")),
    });
  }),
});

http.route({
  path: "/api/feedback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { errors: ["Request body must be valid JSON."] },
        400,
        origin,
      );
    }

    const validation = validateFeedbackSubmission(body);

    if (!validation.ok) {
      return jsonResponse({ errors: validation.errors }, 400, origin);
    }

    try {
      const submission = validation.submission;

      if (isDemoClientKey(submission.clientKey)) {
        await ctx.runMutation(internal.feedback.ensureDemoDataInternal, {});
      }

      const targetExists: boolean = await ctx.runQuery(
        internal.feedback.validateSubmissionTarget,
        {
          clientKey: submission.clientKey,
          requestOrigin: origin,
        },
      );

      if (!targetExists) {
        throw new ConvexError("Unknown Client Key.");
      }

      const rateLimit = await ctx.runMutation(
        internal.feedback.consumeRateLimit,
        { clientKey: submission.clientKey },
      );

      if (!rateLimit.ok) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(rateLimit.retryAfter / 1000),
        );

        return jsonResponse({ errors: [RATE_LIMIT_MESSAGE] }, 429, origin, {
          "Retry-After": String(retryAfterSeconds),
        });
      }

      const persistedItem = await ctx.runMutation(
        internal.feedback.submit,
        await buildSubmitArgs(ctx, submission, origin),
      );

      return jsonResponse(persistedItem, 201, origin);
    } catch (error) {
      if (error instanceof ConvexError) {
        return jsonResponse(
          { errors: [String(error.data ?? STORAGE_UNAVAILABLE_MESSAGE)] },
          400,
          origin,
        );
      }

      return jsonResponse(
        { errors: [STORAGE_UNAVAILABLE_MESSAGE] },
        502,
        origin,
      );
    }
  }),
});

export default http;

async function buildSubmitArgs(
  ctx: ActionCtx,
  submission: FeedbackSubmission,
  origin: string | null,
): Promise<SubmitArgs> {
  const screenshot = submission.screenshot
    ? await uploadScreenshot(ctx, submission.screenshot)
    : null;
  const uploadedImages: StorageUploadedImage[] = [];

  for (const image of submission.uploadedImages ?? []) {
    const storageId = await uploadDataUrl(ctx, image.dataUrl);

    if (storageId) {
      uploadedImages.push({
        name: image.name,
        type: image.type,
        size: image.size,
        storageId,
      });
    }
  }

  return {
    clientKey: submission.clientKey,
    content: submission.content,
    type: normalizeFeedbackType(submission.type),
    screenshot,
    selectedElement: submission.selectedElement ?? null,
    uploadedImages,
    requestOrigin: origin,
    ...(submission.reporterIdentity
      ? { reporterIdentity: submission.reporterIdentity }
      : {}),
    ...(submission.developmentContext
      ? { developmentContext: submission.developmentContext }
      : {}),
    ...(submission.pageContext ? { pageContext: submission.pageContext } : {}),
  };
}

async function uploadScreenshot(
  ctx: ActionCtx,
  screenshot: ScreenshotAttachment,
): Promise<StorageScreenshot | null> {
  const storageId = await uploadDataUrl(ctx, screenshot.dataUrl);

  return storageId
    ? {
        storageId,
        capturedAt: screenshot.capturedAt,
        width: screenshot.width,
        height: screenshot.height,
      }
    : null;
}

async function uploadDataUrl(
  ctx: ActionCtx,
  dataUrl: string,
): Promise<Id<"_storage"> | null> {
  try {
    return (await ctx.storage.store(dataUrlToBlob(dataUrl))) as Id<"_storage">;
  } catch {
    return null;
  }
}

function dataUrlToBlob(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );

  return new Blob([bytes], { type: readDataUrlMimeType(dataUrl) });
}

function readDataUrlMimeType(dataUrl: string) {
  return dataUrl.slice(5, dataUrl.indexOf(";")) || "application/octet-stream";
}

function isDemoClientKey(clientKey: string) {
  return clientKey === "demo_customer_app" || clientKey === "customer-app-demo";
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  additionalHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...additionalHeaders,
    },
  });
}

function corsHeaders(origin: string | null) {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Access-Control-Expose-Headers": "Retry-After",
    Vary: "Origin",
  };
}
