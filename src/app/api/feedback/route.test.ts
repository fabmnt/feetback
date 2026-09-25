import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_DATA_URL_BYTES } from "../../../lib/feedback-contract";
import { OPTIONS, POST } from "./route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/feedback", () => {
  it("answers CORS preflight requests", async () => {
    const response = await OPTIONS(
      new Request("http://feetback.test/api/feedback", {
        method: "OPTIONS",
        headers: { Origin: "https://customer.example" },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://customer.example",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
  });

  it("fails closed when Convex storage is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "");

    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        headers: { Origin: "https://customer.example" },
        body: JSON.stringify({
          clientKey: "customer-app-demo",
          content: "This must not be echoed in production.",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      errors: ["Feedback storage is not configured on this server."],
    });
  });

  it("proxies valid submissions to the Convex HTTP endpoint", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_CONVEX_SITE_URL",
      "https://clever-flamingo.convex.site",
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "stored-feedback" }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "6",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://customer.example",
        },
        body: JSON.stringify({
          clientKey: "customer-app-demo",
          content: "The save button feels hidden.",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "stored-feedback" });
    expect(response.headers.get("Retry-After")).toBe("6");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://clever-flamingo.convex.site/api/feedback"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Origin: "https://customer.example",
        }),
      }),
    );
  });

  it("echoes a valid Feedback Item entity", async () => {
    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          clientKey: "customer-app-demo",
          content: "The save button feels hidden.",
          type: "improvement_suggestion",
          developmentContext: {
            branch: "feature/save-button",
            commit: "abc1234",
          },
          reporterIdentity: {
            id: "reporter-1",
            email: "reporter@example.com",
          },
          pageContext: {
            url: "https://customer.example/settings",
            viewport: {
              width: 1280,
              height: 720,
            },
          },
          selectedElement: {
            tagName: "button",
            label: "Save changes",
            selectorPath: "main > button:nth-of-type(1)",
            boundingBox: {
              x: 24,
              y: 48,
              width: 180,
              height: 44,
            },
          },
          uploadedImages: [
            {
              name: "annotated.png",
              type: "image/png",
              size: 42,
              dataUrl: "data:image/png;base64,aGVsbG8=",
            },
          ],
        }),
      }),
    );

    const item = await response.json();

    expect(response.status).toBe(201);
    expect(item).toMatchObject({
      clientKey: "customer-app-demo",
      content: "The save button feels hidden.",
      type: "improvement_suggestion",
      developmentContext: {
        branch: "feature/save-button",
        commit: "abc1234",
      },
      reporterIdentity: {
        id: "reporter-1",
        email: "reporter@example.com",
      },
      selectedElement: {
        tagName: "button",
        label: "Save changes",
      },
      uploadedImages: [
        {
          name: "annotated.png",
          type: "image/png",
          size: 42,
        },
      ],
    });
    expect(item.id).toEqual(expect.any(String));
    expect(item.submittedAt).toEqual(expect.any(String));
  });

  it("uses Uncategorized when Feedback Type is omitted", async () => {
    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          clientKey: "customer-app-demo",
          content: "Something feels off.",
        }),
      }),
    );

    const item = await response.json();

    expect(response.status).toBe(201);
    expect(item.type).toBe("uncategorized");
  });

  it("returns useful failures for invalid required data", async () => {
    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          clientKey: "",
          content: "",
          type: "feature_request",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toHaveLength(3);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        "clientKey is required.",
        "content is required.",
        "type must be one of the supported Feedback Types.",
      ]),
    );
  });

  it("rejects uploaded image data URLs over the server-side byte limit", async () => {
    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          clientKey: "customer-app-demo",
          content: "The screenshot payload is too large.",
          uploadedImages: [
            {
              name: "large.png",
              type: "image/png",
              size: 42,
              dataUrl: `data:image/png;base64,${"a".repeat(MAX_DATA_URL_BYTES)}`,
            },
          ],
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toContain(
      "uploadedImages[].dataUrl must be 5 MB or smaller.",
    );
  });
});
