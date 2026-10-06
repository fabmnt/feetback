import { resolveLocale } from "../i18n/locale";
import {
  type DevelopmentContext,
  type ElementContext,
  FEEDBACK_TYPES,
  type FeedbackSubmission,
  type FeedbackType,
  type ReporterIdentity,
  type ScreenshotAttachment,
  type UploadedImage,
} from "../lib/feedback-types";
import {
  captureScreenshotAttachment,
  getSelectableElement,
  HOST_ID,
  postFeedbackSubmission,
  readElementContext,
  readUploadedImages,
} from "./browser-io";
import { WIDGET_MESSAGES } from "./messages";

type FeedbackButtonPosition = "bottom-right" | "bottom-left";

/**
 * Optional look of the Script UI. Every key is a CSS value (for example
 * "#123b36" or "8px") and falls back to the default Feetback look.
 */
type FeetbackTheme = {
  accent?: string;
  accentHover?: string;
  accentText?: string;
  highlight?: string;
  text?: string;
  textSoft?: string;
  surface?: string;
  surfaceRaised?: string;
  border?: string;
  radius?: string;
  buttonRadius?: string;
  fontFamily?: string;
};

const THEME_CSS_VARIABLES: Record<keyof FeetbackTheme, string> = {
  accent: "--fb-accent",
  accentHover: "--fb-accent-hover",
  accentText: "--fb-accent-text",
  highlight: "--fb-highlight",
  text: "--fb-text",
  textSoft: "--fb-text-soft",
  surface: "--fb-surface",
  surfaceRaised: "--fb-surface-raised",
  border: "--fb-border",
  radius: "--fb-radius",
  buttonRadius: "--fb-button-radius",
  fontFamily: "--fb-font-family",
};

type FeetbackSettings = {
  clientKey: string;
  apiUrl?: string;
  reporterIdentity?: ReporterIdentity;
  developmentContext?: DevelopmentContext;
  theme?: FeetbackTheme;
  /**
   * Language of the Script UI, such as "en" or "es". Defaults to the
   * Reporter's browser language. Unsupported languages fall back to English.
   */
  language?: string;
  feedbackButton?: {
    enabled?: boolean;
    position?: FeedbackButtonPosition;
    label?: string;
  };
};

type NormalizedFeetbackSettings = Omit<
  Required<FeetbackSettings>,
  "developmentContext" | "language"
> & {
  developmentContext?: DevelopmentContext;
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
  | { status: "submitting"; message: string }
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

export function initFeetbackScript(win: Window = window) {
  if (win.__feetbackRuntime) {
    return win.__feetbackRuntime.api;
  }

  const messages =
    WIDGET_MESSAGES[
      resolveLocale([
        win.FeetbackSettings?.language ?? "",
        ...win.navigator.languages,
      ])
    ];
  const settings = normalizeSettings(
    win.FeetbackSettings,
    messages.defaultButtonLabel,
  );
  const doc = win.document;
  const host = doc.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  applyTheme(host, win.FeetbackSettings?.theme);
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
            ? `<button class="feedback-button" type="button" aria-label="${escapeHtml(messages.openButtonLabel)}">${escapeHtml(
                settings.feedbackButton.label,
              )}</button>`
            : ""
        }
        ${
          state.isOpen
            ? `<section class="feedback-popover" aria-label="${escapeHtml(messages.popoverLabel)}">
                <header class="popover-header">
                  <div>
                    <p class="eyebrow">Feetback</p>
                    <h2>${messages.title}</h2>
                  </div>
                  <button class="icon-button" data-action="close" type="button" aria-label="${messages.close}">&times;</button>
                </header>

                <label class="field">
                  <span>${messages.contentField}</span>
                  <textarea data-field="content" rows="4" placeholder="${escapeHtml(messages.contentPlaceholder)}">${escapeHtml(
                    state.content,
                  )}</textarea>
                </label>

                <label class="field">
                  <span>${messages.typeField}</span>
                  <select data-field="type">
                    <option value="" ${state.type === "" ? "selected" : ""}>${messages.uncategorized}</option>
                    ${FEEDBACK_TYPES.map(
                      (type) =>
                        `<option value="${type}" ${state.type === type ? "selected" : ""}>${messages.feedbackTypes[type]}</option>`,
                    ).join("")}
                  </select>
                </label>

                <div class="context-grid">
                  <div class="context-panel">
                    <div class="panel-copy">
                      <strong>${messages.screenshot}</strong>
                      <span>${messages.screenshotStatus[state.screenshot.status]}</span>
                    </div>
                    ${renderScreenshotPreview(state.screenshot, messages.screenshotPreviewAlt)}
                    ${state.screenshot.status === "captured" ? `<button class="ghost-button" data-action="remove-screenshot" type="button">${messages.remove}</button>` : ""}
                  </div>

                  <div class="context-panel">
                    <div class="panel-copy">
                      <strong>${messages.selectedElement}</strong>
                      <span>${state.selectedElement ? escapeHtml(formatElementSummary(state.selectedElement)) : messages.noneSelected}</span>
                    </div>
                    <div class="button-row">
                      <button class="ghost-button" data-action="select-element" type="button">${messages.select}</button>
                      ${state.selectedElement ? `<button class="ghost-button" data-action="remove-element" type="button">${messages.remove}</button>` : ""}
                    </div>
                  </div>
                </div>

                <label class="field upload-field">
                  <span>${messages.uploadedImages}</span>
                  <input data-field="images" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple />
                  ${state.uploadError ? `<small class="error-text">${escapeHtml(state.uploadError)}</small>` : ""}
                </label>
                ${renderUploadedImages(state.uploadedImages, messages.remove)}

                <footer class="popover-footer">
                  <p class="status ${state.submission.status}">${escapeHtml(state.submission.message)}</p>
                  <button class="submit-button" data-action="submit" type="button" ${canSubmit ? "" : "disabled"}>${messages.send}</button>
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
      const attachment = await captureScreenshotAttachment(doc);

      state.screenshot = {
        status: "captured",
        attachment,
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

    const { images, error } = await readUploadedImages(files, messages.upload);
    state.uploadError = error;

    if (images.length > 0) {
      state.uploadedImages = [...state.uploadedImages, ...images];
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
        message: messages.contentRequired,
      };
      render();
      return;
    }

    if (!settings.clientKey) {
      state.submission = {
        status: "error",
        message: messages.clientKeyMissing,
      };
      render();
      return;
    }

    state.submission = { status: "submitting", message: messages.sending };
    render();

    const submission: FeedbackSubmission = {
      clientKey: settings.clientKey,
      content: state.content.trim(),
      type: state.type,
      reporterIdentity: state.reporterIdentity,
      developmentContext: settings.developmentContext,
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
      await postFeedbackSubmission(win, settings.apiUrl, submission);
      state.content = "";
      state.type = "";
      state.selectedElement = null;
      state.uploadedImages = [];
      state.screenshot = { status: "idle", attachment: null };
      state.submission = {
        status: "success",
        message: messages.sent,
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
        message: isAbortError ? messages.timedOut : messages.sendFailed,
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

function applyTheme(host: HTMLElement, theme: FeetbackTheme | undefined) {
  for (const [key, cssVariable] of Object.entries(THEME_CSS_VARIABLES)) {
    const value = theme?.[key as keyof FeetbackTheme];

    if (typeof value === "string" && value.trim()) {
      host.style.setProperty(cssVariable, value.trim());
    }
  }
}

function normalizeSettings(
  settings: FeetbackSettings | undefined,
  defaultButtonLabel: string,
): NormalizedFeetbackSettings {
  return {
    clientKey: settings?.clientKey?.trim() || "",
    apiUrl: settings?.apiUrl || "/api/feedback",
    reporterIdentity: settings?.reporterIdentity || {},
    developmentContext: settings?.developmentContext,
    theme: settings?.theme || {},
    feedbackButton: {
      enabled: settings?.feedbackButton?.enabled !== false,
      position:
        settings?.feedbackButton?.position === "bottom-left"
          ? "bottom-left"
          : "bottom-right",
      label: settings?.feedbackButton?.label || defaultButtonLabel,
    },
  };
}

function renderScreenshotPreview(screenshot: ScreenshotState, alt: string) {
  if (screenshot.status !== "captured") {
    return "";
  }

  return `<img class="screenshot-preview" src="${screenshot.attachment.dataUrl}" alt="${escapeHtml(alt)}" />`;
}

function renderUploadedImages(
  uploadedImages: UploadedImage[],
  removeLabel: string,
) {
  if (uploadedImages.length === 0) {
    return "";
  }

  return `<div class="image-grid">
    ${uploadedImages
      .map(
        (image, index) => `<figure>
          <img src="${image.dataUrl}" alt="${escapeHtml(image.name)}" />
          <figcaption title="${escapeHtml(image.name)}">${escapeHtml(image.name)}</figcaption>
          <button class="image-remove" data-remove-image-index="${index}" type="button" aria-label="${escapeHtml(removeLabel)} ${escapeHtml(
            image.name,
          )}">${removeLabel}</button>
        </figure>`,
      )
      .join("")}
  </div>`;
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
    --fb-accent: #6b3cf6;
    --fb-accent-hover: #4b1fd1;
    --fb-accent-text: #ffffff;
    --fb-highlight: #ffc933;
    --fb-text: #1f1147;
    --fb-text-soft: #4a3f73;
    --fb-surface: #f7f4ff;
    --fb-surface-raised: #ffffff;
    --fb-border: #d8cdfa;
    --fb-radius: 24px;
    --fb-button-radius: 999px;
    --fb-danger: #b42318;
    --fb-success: #1d7f40;
    --fb-font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color-scheme: light;
    font-family: var(--fb-font-family);
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
    background: var(--fb-accent);
    border: 0;
    border-radius: var(--fb-button-radius);
    box-shadow: 0 12px 32px -12px var(--fb-accent);
    color: var(--fb-accent-text);
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    min-height: 44px;
    padding: 0 20px;
    transition: background-color 120ms;
  }

  .feedback-button:hover,
  .submit-button:hover:not(:disabled) {
    background: var(--fb-accent-hover);
  }

  .feedback-button:focus-visible,
  .submit-button:focus-visible,
  .icon-button:focus-visible,
  .ghost-button:focus-visible,
  textarea:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 3px solid var(--fb-highlight);
    outline-offset: 2px;
  }

  .feedback-popover {
    background: var(--fb-surface);
    border: 1px solid var(--fb-border);
    border-radius: var(--fb-radius);
    box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.45);
    color: var(--fb-text);
    display: grid;
    gap: 14px;
    max-height: min(720px, calc(100vh - 96px));
    overflow: auto;
    padding: 18px;
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
    color: var(--fb-accent);
    font-size: 11px;
    font-weight: 800;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  h2 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0;
  }

  .icon-button,
  .ghost-button {
    appearance: none;
    background: var(--fb-surface-raised);
    border: 1px solid var(--fb-border);
    border-radius: var(--fb-button-radius);
    color: var(--fb-text);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
  }

  .icon-button:hover,
  .ghost-button:hover {
    background: var(--fb-highlight);
  }

  .icon-button {
    height: 32px;
    width: 32px;
  }

  .ghost-button {
    font-size: 13px;
    min-height: 32px;
    padding: 0 12px;
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
    background: var(--fb-surface-raised);
    border: 1px solid var(--fb-border);
    border-radius: calc(var(--fb-radius) / 2);
    color: var(--fb-text);
    font: inherit;
    min-width: 0;
    padding: 10px 12px;
    width: 100%;
  }

  textarea {
    resize: vertical;
  }

  input[type="file"]::file-selector-button {
    background: var(--fb-surface);
    border: 1px solid var(--fb-border);
    border-radius: var(--fb-button-radius);
    color: var(--fb-text);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    margin-right: 10px;
    padding: 4px 12px;
  }

  .context-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr 1fr;
  }

  .context-panel {
    background: var(--fb-surface-raised);
    border: 1px solid var(--fb-border);
    border-radius: calc(var(--fb-radius) / 2);
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
    color: var(--fb-text-soft);
    font-size: 12px;
    line-height: 1.35;
  }

  .screenshot-preview {
    aspect-ratio: 16 / 9;
    border-radius: calc(var(--fb-radius) / 3);
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
    border-radius: calc(var(--fb-radius) / 3);
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
    color: var(--fb-danger);
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
    color: var(--fb-success);
  }

  .status.error,
  .error-text {
    color: var(--fb-danger);
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
