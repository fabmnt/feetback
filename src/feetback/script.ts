import html2canvas from "html2canvas";

import {
  type ElementContext,
  FEEDBACK_TYPES,
  type FeedbackSubmission,
  type FeedbackType,
  type ReporterIdentity,
  type ScreenshotAttachment,
  type UploadedImage,
} from "../lib/feedback-types";

type FeedbackButtonPosition = "bottom-right" | "bottom-left";

type FeetbackSettings = {
  clientKey: string;
  apiUrl?: string;
  reporterIdentity?: ReporterIdentity;
  feedbackButton?: {
    enabled?: boolean;
    position?: FeedbackButtonPosition;
    label?: string;
  };
};

type FeetbackApi = {
  open: () => void;
  close: () => void;
  identify: (reporterIdentity: ReporterIdentity) => void;
};

type ScreenshotState =
  | { status: "idle"; attachment: null }
  | { status: "capturing"; attachment: null }
  | { status: "captured"; attachment: ScreenshotAttachment }
  | { status: "removed"; attachment: null }
  | { status: "failed"; attachment: null };

type SubmissionState =
  | { status: "idle"; message: "" }
  | { status: "submitting"; message: "Sending feedback..." }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type FeetbackRuntime = {
  api: FeetbackApi;
  destroy: () => void;
};

declare global {
  interface Window {
    FeetbackSettings?: FeetbackSettings;
    feetback?: FeetbackApi;
    __feetbackRuntime?: FeetbackRuntime;
  }
}

const HOST_ID = "feetback-shadow-host";
const PRIVACY_MASK_SELECTOR =
  "[data-feetback-mask], [data-feetback-privacy-mask]";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUBMIT_TIMEOUT_MS = 10_000;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const typeLabels: Record<FeedbackType, string> = {
  bug_report: "Bug report",
  complaint: "Complaint",
  security_concern: "Security concern",
  improvement_suggestion: "Improvement suggestion",
  performance_issue: "Performance issue",
  question: "Question",
  other: "Other",
};

export function initFeetbackScript(win: Window = window) {
  if (win.__feetbackRuntime) {
    return win.__feetbackRuntime.api;
  }

  const settings = normalizeSettings(win.FeetbackSettings);
  const doc = win.document;
  const host = doc.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  doc.body.append(host);

  const state = {
    isOpen: false,
    content: "",
    type: "" as FeedbackType | "",
    reporterIdentity: settings.reporterIdentity,
    screenshot: { status: "idle", attachment: null } as ScreenshotState,
    selectedElement: null as ElementContext | null,
    uploadedImages: [] as UploadedImage[],
    uploadError: "",
    submission: { status: "idle", message: "" } as SubmissionState,
    selectionCleanup: null as null | (() => void),
  };

  const api: FeetbackApi = {
    open() {
      state.isOpen = true;
      state.submission = { status: "idle", message: "" };
      render();
      void captureScreenshot();
    },
    close() {
      stopElementSelection();
      state.isOpen = false;
      render();
    },
    identify(reporterIdentity) {
      state.reporterIdentity = reporterIdentity;
    },
  };

  function render() {
    const positionClass =
      settings.feedbackButton.position === "bottom-left" ? "left" : "right";
    const canSubmit =
      state.content.trim().length > 0 &&
      state.submission.status !== "submitting";

    shadow.innerHTML = `
      <style>${styles}</style>
      <div class="feetback-root ${positionClass}">
        ${
          settings.feedbackButton.enabled
            ? `<button class="feedback-button" type="button" aria-label="Open Feetback">${escapeHtml(
                settings.feedbackButton.label,
              )}</button>`
            : ""
        }
        ${
          state.isOpen
            ? `<section class="feedback-popover" aria-label="Feetback Feedback Popover">
                <header class="popover-header">
                  <div>
                    <p class="eyebrow">Feetback</p>
                    <h2>Send feedback</h2>
                  </div>
                  <button class="icon-button" data-action="close" type="button" aria-label="Close">x</button>
                </header>

                <label class="field">
                  <span>Feedback Content</span>
                  <textarea data-field="content" rows="4" placeholder="What should the team know?">${escapeHtml(
                    state.content,
                  )}</textarea>
                </label>

                <label class="field">
                  <span>Feedback Type</span>
                  <select data-field="type">
                    <option value="" ${state.type === "" ? "selected" : ""}>Uncategorized</option>
                    ${FEEDBACK_TYPES.map(
                      (type) =>
                        `<option value="${type}" ${state.type === type ? "selected" : ""}>${typeLabels[type]}</option>`,
                    ).join("")}
                  </select>
                </label>

                <div class="context-grid">
                  <div class="context-panel">
                    <div class="panel-copy">
                      <strong>Screenshot</strong>
                      <span>${screenshotLabel(state.screenshot)}</span>
                    </div>
                    ${renderScreenshotPreview(state.screenshot)}
                    ${state.screenshot.status === "captured" ? `<button class="ghost-button" data-action="remove-screenshot" type="button">Remove</button>` : ""}
                  </div>

                  <div class="context-panel">
                    <div class="panel-copy">
                      <strong>Selected Element</strong>
                      <span>${state.selectedElement ? escapeHtml(formatElementSummary(state.selectedElement)) : "None selected"}</span>
                    </div>
                    <div class="button-row">
                      <button class="ghost-button" data-action="select-element" type="button">Select</button>
                      ${state.selectedElement ? `<button class="ghost-button" data-action="remove-element" type="button">Remove</button>` : ""}
                    </div>
                  </div>
                </div>

                <label class="field upload-field">
                  <span>Uploaded Images</span>
                  <input data-field="images" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple />
                  ${state.uploadError ? `<small class="error-text">${escapeHtml(state.uploadError)}</small>` : ""}
                </label>
                ${renderUploadedImages(state.uploadedImages)}

                <footer class="popover-footer">
                  <p class="status ${state.submission.status}">${escapeHtml(state.submission.message)}</p>
                  <button class="submit-button" data-action="submit" type="button" ${canSubmit ? "" : "disabled"}>Send</button>
                </footer>
              </section>`
            : ""
        }
      </div>
    `;

    shadow
      .querySelector(".feedback-button")
      ?.addEventListener("click", api.open);
    shadow
      .querySelector('[data-action="close"]')
      ?.addEventListener("click", api.close);
    shadow
      .querySelector('[data-action="remove-screenshot"]')
      ?.addEventListener("click", removeScreenshot);
    shadow
      .querySelector('[data-action="select-element"]')
      ?.addEventListener("click", startElementSelection);
    shadow
      .querySelector('[data-action="remove-element"]')
      ?.addEventListener("click", removeSelectedElement);
    shadow
      .querySelector('[data-action="submit"]')
      ?.addEventListener("click", () => void submitFeedback());
    for (const button of shadow.querySelectorAll<HTMLButtonElement>(
      "[data-remove-image-index]",
    )) {
      button.addEventListener("click", () =>
        removeUploadedImage(Number(button.dataset.removeImageIndex)),
      );
    }
    shadow
      .querySelector('[data-field="content"]')
      ?.addEventListener("input", (event) => {
        state.content = (event.currentTarget as HTMLTextAreaElement).value;
        state.submission = { status: "idle", message: "" };
        render();
        focusContentEnd();
      });
    shadow
      .querySelector('[data-field="type"]')
      ?.addEventListener("change", (event) => {
        state.type = (event.currentTarget as HTMLSelectElement).value as
          | FeedbackType
          | "";
      });
    shadow
      .querySelector('[data-field="images"]')
      ?.addEventListener("change", (event) => {
        void addUploadedImages((event.currentTarget as HTMLInputElement).files);
      });
  }

  async function captureScreenshot() {
    if (state.screenshot.status !== "idle") {
      return;
    }

    state.screenshot = { status: "capturing", attachment: null };
    render();

    try {
      const canvas = await html2canvas(doc.body, {
        backgroundColor: null,
        logging: false,
        ignoreElements: (element) =>
          element.id === HOST_ID ||
          Boolean(element.closest(PRIVACY_MASK_SELECTOR)),
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

      state.screenshot = {
        status: "captured",
        attachment: {
          dataUrl: canvas.toDataURL("image/png"),
          capturedAt: new Date().toISOString(),
          width: canvas.width,
          height: canvas.height,
        },
      };
    } catch {
      state.screenshot = { status: "failed", attachment: null };
    }

    render();
  }

  function removeScreenshot() {
    state.screenshot = { status: "removed", attachment: null };
    render();
  }

  function startElementSelection() {
    state.isOpen = false;
    render();

    const outline = doc.createElement("div");
    outline.setAttribute("aria-hidden", "true");
    outline.style.cssText = [
      "position:absolute",
      "z-index:2147483646",
      "pointer-events:none",
      "border:2px solid #1d9a8a",
      "box-shadow:0 0 0 99999px rgba(15,23,42,0.16)",
      "border-radius:6px",
      "display:none",
    ].join(";");
    doc.body.append(outline);

    let candidate: Element | null = null;

    const updateOutline = (element: Element | null) => {
      if (!element) {
        outline.style.display = "none";
        return;
      }

      const rect = element.getBoundingClientRect();
      outline.style.display = "block";
      outline.style.left = `${rect.left + win.scrollX}px`;
      outline.style.top = `${rect.top + win.scrollY}px`;
      outline.style.width = `${rect.width}px`;
      outline.style.height = `${rect.height}px`;
    };

    const onPointerMove = (event: PointerEvent) => {
      const element = doc.elementFromPoint(event.clientX, event.clientY);
      candidate = getSelectableElement(element);
      updateOutline(candidate);
    };

    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (candidate) {
        state.selectedElement = readElementContext(candidate);
      }

      stopElementSelection();
      state.isOpen = true;
      render();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stopElementSelection();
        state.isOpen = true;
        render();
      }
    };

    doc.addEventListener("pointermove", onPointerMove, true);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("keydown", onKeyDown, true);

    state.selectionCleanup = () => {
      outline.remove();
      doc.removeEventListener("pointermove", onPointerMove, true);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      state.selectionCleanup = null;
    };
  }

  function stopElementSelection() {
    state.selectionCleanup?.();
  }

  function removeSelectedElement() {
    state.selectedElement = null;
    render();
  }

  async function addUploadedImages(files: FileList | null) {
    state.uploadError = "";

    if (!files || files.length === 0) {
      render();
      return;
    }

    const acceptedFiles = Array.from(files).filter((file) => {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        state.uploadError =
          "Only PNG, JPEG, GIF, or WebP images can be uploaded.";
        return false;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        state.uploadError = "Images must be 5 MB or smaller.";
        return false;
      }

      return true;
    });

    try {
      const images = await Promise.all(acceptedFiles.map(readUploadedImage));
      state.uploadedImages = [...state.uploadedImages, ...images];
    } catch {
      state.uploadError = "One or more images could not be read.";
    }

    render();
  }

  function removeUploadedImage(index: number) {
    state.uploadedImages = state.uploadedImages.filter(
      (_, imageIndex) => imageIndex !== index,
    );
    render();
  }

  async function submitFeedback() {
    if (!state.content.trim()) {
      state.submission = {
        status: "error",
        message: "Feedback Content is required.",
      };
      render();
      return;
    }

    if (!settings.clientKey) {
      state.submission = {
        status: "error",
        message: "Feetback client key is missing.",
      };
      render();
      return;
    }

    state.submission = { status: "submitting", message: "Sending feedback..." };
    render();

    const submission: FeedbackSubmission = {
      clientKey: settings.clientKey,
      content: state.content.trim(),
      type: state.type,
      reporterIdentity: state.reporterIdentity,
      pageContext: {
        url: win.location.href,
        title: doc.title,
        userAgent: win.navigator.userAgent,
        timestamp: new Date().toISOString(),
        viewport: {
          width: win.innerWidth,
          height: win.innerHeight,
        },
      },
      screenshot:
        state.screenshot.status === "captured"
          ? state.screenshot.attachment
          : null,
      selectedElement: state.selectedElement,
      uploadedImages: state.uploadedImages,
    };

    try {
      const controller = new AbortController();
      const timeoutId = win.setTimeout(
        () => controller.abort(),
        SUBMIT_TIMEOUT_MS,
      );
      let response: Response;

      try {
        response = await fetch(settings.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submission),
          signal: controller.signal,
        });
      } finally {
        win.clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error("Feedback Submission failed.");
      }

      await response.json();
      state.content = "";
      state.type = "";
      state.selectedElement = null;
      state.uploadedImages = [];
      state.screenshot = { status: "idle", attachment: null };
      state.submission = {
        status: "success",
        message: "Feedback sent. Thank you.",
      };
      render();
    } catch (error) {
      const isAbortError =
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError";

      state.submission = {
        status: "error",
        message: isAbortError
          ? "Feedback submission timed out. Please try again."
          : "Could not send feedback. Please try again.",
      };
      render();
    }
  }

  function destroy() {
    stopElementSelection();
    host.remove();
    delete win.feetback;
    delete win.__feetbackRuntime;
  }

  render();

  const runtime = { api, destroy };
  win.feetback = api;
  win.__feetbackRuntime = runtime;

  return api;
}

function normalizeSettings(
  settings: FeetbackSettings | undefined,
): Required<FeetbackSettings> {
  return {
    clientKey: settings?.clientKey?.trim() || "",
    apiUrl: settings?.apiUrl || "/api/feedback",
    reporterIdentity: settings?.reporterIdentity || {},
    feedbackButton: {
      enabled: settings?.feedbackButton?.enabled !== false,
      position:
        settings?.feedbackButton?.position === "bottom-left"
          ? "bottom-left"
          : "bottom-right",
      label: settings?.feedbackButton?.label || "Feedback",
    },
  };
}

function screenshotLabel(screenshot: ScreenshotState) {
  switch (screenshot.status) {
    case "capturing":
      return "Capturing automatically";
    case "captured":
      return "Attached";
    case "removed":
      return "Removed";
    case "failed":
      return "Unavailable, submission still works";
    case "idle":
      return "Will attach automatically";
  }
}

function renderScreenshotPreview(screenshot: ScreenshotState) {
  if (screenshot.status !== "captured") {
    return "";
  }

  return `<img class="screenshot-preview" src="${screenshot.attachment.dataUrl}" alt="Screenshot preview" />`;
}

function renderUploadedImages(uploadedImages: UploadedImage[]) {
  if (uploadedImages.length === 0) {
    return "";
  }

  return `<div class="image-grid">
    ${uploadedImages
      .map(
        (image, index) => `<figure>
          <img src="${image.dataUrl}" alt="${escapeHtml(image.name)}" />
          <figcaption title="${escapeHtml(image.name)}">${escapeHtml(image.name)}</figcaption>
          <button class="image-remove" data-remove-image-index="${index}" type="button" aria-label="Remove ${escapeHtml(
            image.name,
          )}">Remove</button>
        </figure>`,
      )
      .join("")}
  </div>`;
}

function getSelectableElement(element: Element | null) {
  if (
    !element ||
    element.id === HOST_ID ||
    element.closest(`#${HOST_ID}`) ||
    element.closest(PRIVACY_MASK_SELECTOR)
  ) {
    return null;
  }

  return element;
}

function readElementContext(element: Element): ElementContext {
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
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    });
    reader.readAsDataURL(file);
  });
}

function focusContentEnd() {
  const textarea = document
    .getElementById(HOST_ID)
    ?.shadowRoot?.querySelector<HTMLTextAreaElement>('[data-field="content"]');

  if (!textarea) {
    return;
  }

  textarea.focus();
  textarea.selectionStart = textarea.value.length;
  textarea.selectionEnd = textarea.value.length;
}

function formatElementSummary(element: ElementContext) {
  return [element.tagName, element.label].filter(Boolean).join(" - ");
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

function escapeHtml(value: string | undefined) {
  return (value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const styles = `
  :host {
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  .feetback-root {
    bottom: 20px;
    display: grid;
    gap: 12px;
    justify-items: end;
    position: fixed;
    z-index: 2147483645;
  }

  .feetback-root.right {
    right: 20px;
  }

  .feetback-root.left {
    left: 20px;
    justify-items: start;
  }

  .feedback-button,
  .submit-button {
    appearance: none;
    background: #123b36;
    border: 0;
    border-radius: 999px;
    box-shadow: 0 16px 40px rgba(18, 59, 54, 0.28);
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 750;
    min-height: 44px;
    padding: 0 18px;
  }

  .feedback-button:hover,
  .submit-button:hover:not(:disabled) {
    background: #0d2f2b;
  }

  .feedback-popover {
    background: #fbfaf7;
    border: 1px solid rgba(18, 59, 54, 0.14);
    border-radius: 8px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
    color: #17201f;
    display: grid;
    gap: 12px;
    max-height: min(720px, calc(100vh - 96px));
    overflow: auto;
    padding: 14px;
    width: min(380px, calc(100vw - 32px));
  }

  .popover-header,
  .popover-footer,
  .button-row {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: space-between;
  }

  .eyebrow {
    color: #1d9a8a;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0;
    margin: 0 0 2px;
    text-transform: uppercase;
  }

  h2 {
    font-size: 18px;
    line-height: 1.15;
    margin: 0;
  }

  .icon-button,
  .ghost-button {
    appearance: none;
    background: #ffffff;
    border: 1px solid rgba(18, 59, 54, 0.16);
    border-radius: 6px;
    color: #17201f;
    cursor: pointer;
    font: inherit;
  }

  .icon-button {
    height: 32px;
    width: 32px;
  }

  .ghost-button {
    min-height: 32px;
    padding: 0 10px;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field span,
  .panel-copy strong {
    font-size: 12px;
    font-weight: 800;
  }

  textarea,
  select,
  input[type="file"] {
    background: #ffffff;
    border: 1px solid rgba(18, 59, 54, 0.16);
    border-radius: 6px;
    color: #17201f;
    font: inherit;
    min-width: 0;
    padding: 10px;
    width: 100%;
  }

  textarea {
    resize: vertical;
  }

  .context-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr 1fr;
  }

  .context-panel {
    background: #ffffff;
    border: 1px solid rgba(18, 59, 54, 0.12);
    border-radius: 8px;
    display: grid;
    gap: 10px;
    min-width: 0;
    padding: 10px;
  }

  .panel-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .panel-copy span,
  .status,
  .error-text,
  figcaption {
    color: #65706d;
    font-size: 12px;
    line-height: 1.35;
  }

  .screenshot-preview {
    aspect-ratio: 16 / 9;
    border-radius: 6px;
    object-fit: cover;
    width: 100%;
  }

  .image-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  figure {
    display: grid;
    gap: 4px;
    margin: 0;
    min-width: 0;
  }

  figure img {
    aspect-ratio: 1;
    border-radius: 6px;
    object-fit: cover;
    width: 100%;
  }

  figcaption {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .image-remove {
    appearance: none;
    background: transparent;
    border: 0;
    color: #b42318;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    padding: 0;
    text-align: left;
  }

  .status {
    flex: 1;
    margin: 0;
    min-height: 18px;
  }

  .status.success {
    color: #1d7f40;
  }

  .status.error,
  .error-text {
    color: #b42318;
  }

  .submit-button:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }

  @media (max-width: 420px) {
    .feetback-root {
      bottom: 12px;
      left: 12px;
      right: 12px;
    }

    .context-grid {
      grid-template-columns: 1fr;
    }
  }
`;

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initFeetbackScript(), {
      once: true,
    });
  } else {
    initFeetbackScript();
  }
}
