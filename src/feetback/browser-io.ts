import html2canvas from "html2canvas";

import type {
  ElementContext,
  FeedbackSubmission,
  ScreenshotAttachment,
  UploadedImage,
} from "../lib/feedback-types";

export const HOST_ID = "feetback-shadow-host";
export const PRIVACY_MASK_SELECTOR =
  "[data-feetback-mask], [data-feetback-privacy-mask]";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DATA_URL_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES_ERROR = "Images must be 5 MB or smaller.";
const SUBMIT_TIMEOUT_MS = 10_000;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export async function captureScreenshotAttachment(
  doc: Document,
): Promise<ScreenshotAttachment> {
  const canvas = await html2canvas(doc.body, {
    backgroundColor: null,
    logging: false,
    ignoreElements: (element) =>
      element.id === HOST_ID || Boolean(element.closest(PRIVACY_MASK_SELECTOR)),
    onclone: (clonedDocument) => {
      for (const maskedElement of clonedDocument.querySelectorAll(
        PRIVACY_MASK_SELECTOR,
      )) {
        if (maskedElement instanceof HTMLElement) {
          maskedElement.style.visibility = "hidden";
        }
      }
    },
  });

  const dataUrl = canvas.toDataURL("image/png");
  if (!isWithinDataUrlByteLimit(dataUrl)) {
    throw new Error("Screenshot must be 5 MB or smaller.");
  }

  return {
    dataUrl,
    capturedAt: new Date().toISOString(),
    width: canvas.width,
    height: canvas.height,
  };
}

export function getSelectableElement(element: Element | null) {
  if (
    !element ||
    element.id === HOST_ID ||
    element.closest(`#${HOST_ID}`) ||
    isInsideFeetbackShadowRoot(element) ||
    element.closest(PRIVACY_MASK_SELECTOR)
  ) {
    return null;
  }

  return element;
}

export function readElementContext(element: Element): ElementContext {
  const rect = element.getBoundingClientRect();
  const label = readSafeElementLabel(element);

  return {
    tagName: element.tagName.toLowerCase(),
    label,
    selectorPath: buildSelectorPath(element),
    boundingBox: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    highlightContext: label
      ? `${element.tagName.toLowerCase()} "${label}"`
      : element.tagName.toLowerCase(),
  };
}

export async function readUploadedImages(files: FileList | null) {
  if (!files || files.length === 0) {
    return { images: [] as UploadedImage[], error: "" };
  }

  let error = "";
  const acceptedFiles = Array.from(files).filter((file) => {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      error = "Only PNG, JPEG, GIF, or WebP images can be uploaded.";
      return false;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      error = MAX_IMAGE_BYTES_ERROR;
      return false;
    }

    return true;
  });

  try {
    return {
      images: await Promise.all(acceptedFiles.map(readUploadedImage)),
      error,
    };
  } catch (caughtError) {
    return {
      images: [] as UploadedImage[],
      error:
        caughtError instanceof Error
          ? caughtError.message
          : "One or more images could not be read.",
    };
  }
}

export async function postFeedbackSubmission(
  win: Window,
  apiUrl: string,
  submission: FeedbackSubmission,
) {
  const controller = new AbortController();
  const timeoutId = win.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submission),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Feedback Submission failed.");
    }

    return await response.json();
  } finally {
    win.clearTimeout(timeoutId);
  }
}

function readSafeElementLabel(element: Element) {
  if (element.closest(PRIVACY_MASK_SELECTOR)) {
    return undefined;
  }

  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) {
    return truncate(ariaLabel, 80);
  }

  if (element instanceof HTMLInputElement && element.type !== "password") {
    return truncate(
      element.placeholder ||
        element.name ||
        element.getAttribute("aria-label") ||
        element.id,
      80,
    );
  }

  if (element instanceof HTMLTextAreaElement) {
    return truncate(element.placeholder || element.name, 80);
  }

  return truncate((element.textContent || "").replace(/\s+/g, " ").trim(), 80);
}

function buildSelectorPath(element: Element) {
  const parts: string[] = [];
  let current: Element | null = element;
  const body = element.ownerDocument.body;

  while (current && current !== body && parts.length < 5) {
    const tagName = current.tagName.toLowerCase();
    const id =
      current.id && current.id !== HOST_ID ? `#${cssEscape(current.id)}` : "";
    const className = Array.from(current.classList)
      .slice(0, 2)
      .map((value) => `.${cssEscape(value)}`)
      .join("");
    const siblingIndex = Array.from(current.parentElement?.children ?? [])
      .filter((sibling) => sibling.tagName === current?.tagName)
      .indexOf(current);

    parts.unshift(
      `${tagName}${id}${className}${siblingIndex > 0 ? `:nth-of-type(${siblingIndex + 1})` : ""}`,
    );
    current = current.parentElement;
  }

  return parts.join(" > ");
}

function readUploadedImage(file: File) {
  return new Promise<UploadedImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () =>
      reject(new Error("Unable to read image.")),
    );
    reader.addEventListener("load", () => {
      const dataUrl = String(reader.result);
      if (!isWithinDataUrlByteLimit(dataUrl)) {
        reject(new Error(MAX_IMAGE_BYTES_ERROR));
        return;
      }

      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    });
    reader.readAsDataURL(file);
  });
}

function isInsideFeetbackShadowRoot(element: Element) {
  const root = element.getRootNode();
  return root instanceof ShadowRoot && root.host.id === HOST_ID;
}

function isWithinDataUrlByteLimit(dataUrl: string) {
  return new TextEncoder().encode(dataUrl).byteLength <= MAX_DATA_URL_BYTES;
}

function truncate(value: string | undefined, maxLength: number) {
  if (!value) {
    return undefined;
  }

  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}...`
    : value;
}

function cssEscape(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
