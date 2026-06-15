import { ConvexHttpClient } from "convex/browser";
import {
  createFeedbackItem,
  normalizeFeedbackType,
  validateFeedbackSubmission,
} from "@/lib/feedback-contract";
import { api } from "../../../../convex/_generated/api";

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

  const submittedAt = new Date().toISOString();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (convexUrl && process.env.NODE_ENV !== "test") {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const persistedItem = await client.mutation(api.feedback.submitPublic, {
        ...validation.submission,
        type: normalizeFeedbackType(validation.submission.type),
        requestOrigin: request.headers.get("origin"),
        submittedAt,
      });

      return Response.json(persistedItem, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Feedback Submission could not be persisted.";

      return Response.json({ errors: [message] }, { status: 400 });
    }
  }

  return Response.json(
    createFeedbackItem(validation.submission, { submittedAt }),
    {
      status: 201,
    },
  );
}
