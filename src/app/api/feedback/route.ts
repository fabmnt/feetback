import { validateFeedbackSubmission } from "@/lib/feedback-contract";

const STORAGE_UNAVAILABLE_MESSAGE =
  "Feedback could not be saved. Please try again.";
const STORAGE_NOT_CONFIGURED_MESSAGE =
  "Feedback storage is not configured on this server.";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { errors: ["Request body must be valid JSON."] },
      400,
      request.headers.get("origin"),
    );
  }

  const validation = validateFeedbackSubmission(body);
  const origin = request.headers.get("origin");

  if (!validation.ok) {
    return jsonResponse({ errors: validation.errors }, 400, origin);
  }

  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

  if (!convexSiteUrl) {
    return jsonResponse(
      { errors: [STORAGE_NOT_CONFIGURED_MESSAGE] },
      503,
      origin,
    );
  }

  try {
    const response = await fetch(new URL("/api/feedback", convexSiteUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(validation.submission),
    });
    const retryAfter = response.headers.get("Retry-After");

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
        ...corsHeaders(origin),
        ...(retryAfter ? { "Retry-After": retryAfter } : {}),
      },
    });
  } catch {
    return jsonResponse({ errors: [STORAGE_UNAVAILABLE_MESSAGE] }, 502, origin);
  }
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return Response.json(body, {
    status,
    headers: corsHeaders(origin),
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
