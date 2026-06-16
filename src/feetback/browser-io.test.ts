import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSelectableElement,
  HOST_ID,
  readElementContext,
  readUploadedImages,
} from "./browser-io";

vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

describe("Feetback browser IO", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps Script UI and Privacy Mask elements out of Element Selection Mode", () => {
    const host = document.createElement("div");
    host.id = HOST_ID;
    const masked = document.createElement("section");
    masked.setAttribute("data-feetback-mask", "");
    const maskedButton = document.createElement("button");
    const normalButton = document.createElement("button");

    masked.append(maskedButton);
    document.body.append(host, masked, normalButton);

    expect(getSelectableElement(host)).toBeNull();
    expect(getSelectableElement(maskedButton)).toBeNull();
    expect(getSelectableElement(normalButton)).toBe(normalButton);
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
});

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
