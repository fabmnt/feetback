import {
  createFeedbackItem,
  validateFeedbackSubmission,
} from "@/lib/feedback-contract";

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

  return Response.json(createFeedbackItem(validation.submission), {
    status: 201,
  });
}
