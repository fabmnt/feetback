import { describe, expect, it } from "vitest";

import { MAX_DATA_URL_BYTES } from "../../../lib/feedback-contract";
import { POST } from "./route";

describe("POST /api/feedback", () => {
  it("echoes a valid Feedback Item entity", async () => {
    const response = await POST(
      new Request("http://feetback.test/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          clientKey: "customer-app-demo",
          content: "The save button feels hidden.",
          type: "improvement_suggestion",
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
