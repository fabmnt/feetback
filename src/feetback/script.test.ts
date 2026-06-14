import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => ({
    width: 320,
    height: 180,
    toDataURL: () => "data:image/png;base64,c2NyZWVuc2hvdA==",
  })),
}));

describe("Feetback script", () => {
  afterEach(() => {
    window.__feetbackRuntime?.destroy();
    delete window.FeetbackSettings;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("renders the default Feedback Button and opens the Feedback Popover", async () => {
    window.FeetbackSettings = {
      clientKey: "demo_customer_app",
      feedbackButton: {
        position: "bottom-left",
      },
    };

    await import("./script");

    const shadow = getShadowRoot();
    const button = shadow.querySelector<HTMLButtonElement>(".feedback-button");

    expect(button).not.toBeNull();
    expect(
      shadow.querySelector(".feetback-root")?.classList.contains("left"),
    ).toBe(true);

    button?.click();

    expect(shadow.querySelector(".feedback-popover")).not.toBeNull();
    expect(
      shadow.querySelector<HTMLTextAreaElement>('[data-field="content"]'),
    ).not.toBeNull();
    expect(
      shadow.querySelector<HTMLSelectElement>('[data-field="type"]'),
    ).not.toBeNull();
    expect(
      shadow.querySelector<HTMLInputElement>('[data-field="images"]'),
    ).not.toBeNull();
  });

  it("can disable the default Feedback Button and open through window.feetback", async () => {
    window.FeetbackSettings = {
      clientKey: "demo_customer_app",
      feedbackButton: {
        enabled: false,
      },
    };

    await import("./script");

    const shadow = getShadowRoot();

    expect(shadow.querySelector(".feedback-button")).toBeNull();

    window.feetback?.open();

    expect(shadow.querySelector(".feedback-popover")).not.toBeNull();
  });

  it("submits Feedback Content with optional context to the configured endpoint", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ id: "feedback_1" }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.FeetbackSettings = {
      clientKey: "demo_customer_app",
      apiUrl: "/api/feedback",
      reporterIdentity: {
        id: "reporter_123",
      },
    };

    await import("./script");

    const shadow = getShadowRoot();
    window.feetback?.open();

    const textarea = shadow.querySelector<HTMLTextAreaElement>(
      '[data-field="content"]',
    );
    const submit = shadow.querySelector<HTMLButtonElement>(
      '[data-action="submit"]',
    );

    expect(textarea).not.toBeNull();
    expect(submit?.disabled).toBe(true);

    if (!textarea) {
      throw new Error("Expected Feedback Content textarea to render.");
    }

    textarea.value = "The renewal table is hard to scan.";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    shadow.querySelector<HTMLButtonElement>('[data-action="submit"]')?.click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const firstCall = fetchMock.mock.calls[0];
    const url = String(firstCall?.[0]);
    const init = firstCall?.[1];

    expect(init).toBeDefined();
    const payload = JSON.parse(String(init?.body));

    expect(url).toBe("/api/feedback");
    expect(payload).toMatchObject({
      clientKey: "demo_customer_app",
      content: "The renewal table is hard to scan.",
      type: "",
      reporterIdentity: {
        id: "reporter_123",
      },
    });
    expect(payload.pageContext.url).toEqual(expect.any(String));
  });

  it("does not submit when the client key is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    window.FeetbackSettings = {
      clientKey: "",
      apiUrl: "/api/feedback",
    };

    await import("./script");

    const shadow = getShadowRoot();
    window.feetback?.open();

    enterFeedbackContent(shadow, "This should not submit.");
    shadow.querySelector<HTMLButtonElement>('[data-action="submit"]')?.click();

    await vi.waitFor(() =>
      expect(shadow.querySelector(".status.error")?.textContent).toBe(
        "Feetback client key is missing.",
      ),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a timeout error when feedback submission stalls", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.FeetbackSettings = {
      clientKey: "demo_customer_app",
      apiUrl: "/api/feedback",
    };

    await import("./script");

    const shadow = getShadowRoot();
    window.feetback?.open();

    enterFeedbackContent(shadow, "The form never finishes sending.");
    shadow.querySelector<HTMLButtonElement>('[data-action="submit"]')?.click();

    await vi.advanceTimersByTimeAsync(10_000);

    await vi.waitFor(() =>
      expect(shadow.querySelector(".status.error")?.textContent).toBe(
        "Feedback submission timed out. Please try again.",
      ),
    );
  });
});

function getShadowRoot() {
  const shadow = document.getElementById("feetback-shadow-host")?.shadowRoot;
  expect(shadow).toBeTruthy();
  return shadow as ShadowRoot;
}

function enterFeedbackContent(shadow: ShadowRoot, content: string) {
  const textarea = shadow.querySelector<HTMLTextAreaElement>(
    '[data-field="content"]',
  );

  expect(textarea).not.toBeNull();

  if (!textarea) {
    throw new Error("Expected Feedback Content textarea to render.");
  }

  textarea.value = content;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
