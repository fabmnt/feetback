import html2canvas from "html2canvas";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedbackSubmission } from "../lib/feedback-types";
import {
  captureScreenshotAttachment,
  getSelectableElement,
  HOST_ID,
  postFeedbackSubmission,
  readElementContext,
  readUploadedImages,
} from "./browser-io";

vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

describe("Feetback browser IO", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("keeps Script UI and Privacy Mask elements out of Element Selection Mode", () => {
    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadowRoot = host.attachShadow({ mode: "open" });
    const shadowButton = document.createElement("button");
    const masked = document.createElement("section");
    masked.setAttribute("data-feetback-mask", "");
    const maskedButton = document.createElement("button");
    const normalButton = document.createElement("button");

    shadowRoot.append(shadowButton);
    masked.append(maskedButton);
    document.body.append(host, masked, normalButton);

    expect(getSelectableElement(host)).toBeNull();
    expect(getSelectableElement(shadowButton)).toBeNull();
    expect(getSelectableElement(maskedButton)).toBeNull();
    expect(getSelectableElement(normalButton)).toBe(normalButton);
  });

  it("captures screenshot attachments from html2canvas output", async () => {
    const dataUrl = "data:image/png;base64,aGVsbG8=";
    vi.mocked(html2canvas).mockResolvedValue(
      createCanvasResult({ dataUrl, width: 1280, height: 720 }),
    );

    const attachment = await captureScreenshotAttachment(document);

    expect(attachment).toMatchObject({
      dataUrl,
      width: 1280,
      height: 720,
    });
    expect(attachment.capturedAt).toEqual(expect.any(String));
    expect(html2canvas).toHaveBeenCalledWith(
      document.body,
      expect.objectContaining({
        backgroundColor: null,
        logging: false,
      }),
    );
  });

  it("rejects screenshot data URLs that exceed the submission limit", async () => {
    vi.mocked(html2canvas).mockResolvedValue(
      createCanvasResult({
        dataUrl: `data:image/png;base64,${"a".repeat(5 * 1024 * 1024)}`,
      }),
    );

    await expect(captureScreenshotAttachment(document)).rejects.toThrow(
      "Screenshot must be 5 MB or smaller.",
    );
  });

  it("propagates aborted screenshot capture failures", async () => {
    vi.mocked(html2canvas).mockRejectedValue(
      new DOMException("Capture aborted.", "AbortError"),
    );

    await expect(captureScreenshotAttachment(document)).rejects.toThrow(
      "Capture aborted.",
    );
  });

  it("reads lightweight Element Context without raw HTML", () => {
    const button = document.createElement("button");
    button.className = "primary action";
    button.textContent = "Save renewal";
    document.body.append(button);
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      x: 20,
      y: 30,
      width: 160,
      height: 44,
      top: 30,
      right: 180,
      bottom: 74,
      left: 20,
      toJSON: () => ({}),
    });

    expect(readElementContext(button)).toMatchObject({
      tagName: "button",
      label: "Save renewal",
      selectorPath: "button.primary.action",
      boundingBox: {
        x: 20,
        y: 30,
        width: 160,
        height: 44,
      },
      highlightContext: 'button "Save renewal"',
    });
  });

  it("accepts web images and rejects unsupported uploads at the same interface", async () => {
    const files = createFileList([
      new File(["image"], "context.png", { type: "image/png" }),
      new File(["plain"], "notes.txt", { type: "text/plain" }),
    ]);

    const result = await readUploadedImages(files);

    expect(result.error).toBe(
      "Only PNG, JPEG, GIF, or WebP images can be uploaded.",
    );
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toMatchObject({
      name: "context.png",
      type: "image/png",
      size: 5,
    });
    expect(result.images[0]?.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects uploaded image data URLs over the submission limit", async () => {
    const files = createFileList([
      new File(["a".repeat(5 * 1024 * 1024 - 1)], "large.png", {
        type: "image/png",
      }),
    ]);

    const result = await readUploadedImages(files);

    expect(result.images).toEqual([]);
    expect(result.error).toBe("Images must be 5 MB or smaller.");
  });

  it("posts Feedback Submissions and returns the JSON response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "feedback-1" }), { status: 201 }),
    );

    await expect(
      postFeedbackSubmission(window, "/api/feedback", createSubmission()),
    ).resolves.toEqual({ id: "feedback-1" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/feedback",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createSubmission()),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects non-OK Feedback Submission responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ errors: ["Invalid"] }), { status: 400 }),
    );

    await expect(
      postFeedbackSubmission(window, "/api/feedback", createSubmission()),
    ).rejects.toThrow("Feedback Submission failed.");
  });

  it("rejects Feedback Submission network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down."));

    await expect(
      postFeedbackSubmission(window, "/api/feedback", createSubmission()),
    ).rejects.toThrow("Network down.");
  });

  it("aborts Feedback Submission requests after the timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Request aborted.", "AbortError"));
        });
      });
    });

    const submission = postFeedbackSubmission(
      window,
      "/api/feedback",
      createSubmission(),
    );
    const rejection = expect(submission).rejects.toThrow("Request aborted.");

    await vi.advanceTimersByTimeAsync(10_000);

    await rejection;
  });
});

function createCanvasResult({
  dataUrl,
  width = 800,
  height = 600,
}: {
  dataUrl: string;
  width?: number;
  height?: number;
}) {
  return {
    width,
    height,
    toDataURL: () => dataUrl,
  } as unknown as HTMLCanvasElement;
}

function createSubmission(): FeedbackSubmission {
  return {
    clientKey: "customer-app-demo",
    content: "The save button feels hidden.",
  };
}

function createFileList(files: File[]) {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
  } as Record<string, unknown>;

  files.forEach((file, index) => {
    fileList[index] = file;
  });

  return fileList as unknown as FileList;
}
