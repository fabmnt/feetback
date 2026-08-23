import { ConvexHttpClient } from "convex/browser";
import type { FunctionArgs } from "convex/server";
import { ConvexError } from "convex/values";
import {
  createFeedbackItem,
  type FeedbackSubmission,
  normalizeFeedbackType,
  validateFeedbackSubmission,
} from "@/lib/feedback-contract";
import type { ScreenshotAttachment } from "@/lib/feedback-types";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type SubmitPublicArgs = FunctionArgs<typeof api.feedback.submitPublic>;
type StorageScreenshot = NonNullable<SubmitPublicArgs["screenshot"]>;
type StorageUploadedImage = NonNullable<
  SubmitPublicArgs["uploadedImages"]
>[number];

const STORAGE_UNAVAILABLE_MESSAGE =
  "Feedback could not be saved. Please try again.";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { errors: ["Request body must be valid JSON."] },
      { status: 400 },
    );
  }

  const validation = validateFeedbackSubmission(body);

  if (!validation.ok) {
    return Response.json({ errors: validation.errors }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl || process.env.NODE_ENV === "test") {
    return echoFeedbackItem(validation.submission);
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const submission = await uploadFeedbackMedia(client, validation.submission);
    const persistedItem = await client.mutation(api.feedback.submitPublic, {
      ...submission,
      type: normalizeFeedbackType(submission.type),
      requestOrigin: request.headers.get("origin"),
    });

    return Response.json(persistedItem, { status: 201 });
  } catch (error) {
    // ConvexError carries a domain rejection (unknown Client Key, disallowed
    // Origin); anything else means Feetback storage itself failed.
    if (error instanceof ConvexError) {
      return Response.json(
        { errors: [String(error.data ?? STORAGE_UNAVAILABLE_MESSAGE)] },
        { status: 400 },
      );
    }

    return Response.json(
      { errors: [STORAGE_UNAVAILABLE_MESSAGE] },
      { status: 502 },
    );
  }
}

function echoFeedbackItem(submission: FeedbackSubmission) {
  return Response.json(createFeedbackItem(submission), { status: 201 });
}

// Media is best-effort: a failed upload drops that image but never blocks the
// Feedback Submission itself (mirrors the script's capture-failure behavior).
async function uploadFeedbackMedia(
  client: ConvexHttpClient,
  submission: FeedbackSubmission,
) {
  const screenshot = submission.screenshot
    ? await uploadScreenshot(client, submission.screenshot)
    : null;
  const uploadedImages: StorageUploadedImage[] = [];

  for (const image of submission.uploadedImages ?? []) {
    const storageId = await uploadDataUrl(client, image.dataUrl);

    if (storageId) {
      uploadedImages.push({
        name: image.name,
        type: image.type,
        size: image.size,
        storageId,
      });
    }
  }

  return { ...submission, screenshot, uploadedImages };
}

async function uploadScreenshot(
  client: ConvexHttpClient,
  screenshot: ScreenshotAttachment,
): Promise<StorageScreenshot | null> {
  const storageId = await uploadDataUrl(client, screenshot.dataUrl);

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
  client: ConvexHttpClient,
  dataUrl: string,
): Promise<Id<"_storage"> | null> {
  try {
    const uploadUrl: string = await client.mutation(
      api.feedback.createMediaUploadUrl,
      {},
    );
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": readDataUrlMimeType(dataUrl) },
      body: dataUrlToBlob(dataUrl),
    });

    if (!response.ok) {
      return null;
    }

    const { storageId } = (await response.json()) as { storageId?: string };

    return storageId ? (storageId as Id<"_storage">) : null;
  } catch {
    return null;
  }
}

function readDataUrlMimeType(dataUrl: string) {
  return dataUrl.slice(5, dataUrl.indexOf(";")) || "application/octet-stream";
}

function dataUrlToBlob(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

  return new Blob([bytes], { type: readDataUrlMimeType(dataUrl) });
}
