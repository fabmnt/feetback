import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { EMBEDDING_DIMENSIONS } from "../convex/lib/triageConfig";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.*s");
const ORIGIN = "https://customer.example";
const CLIENT_KEY = "fbk_triage";

type DecisionBody = {
  input: string;
  questions: Record<string, { criteria: Record<string, string> }>;
};
type DecisionAnswers = Record<string, { choice: string; confidence: number }>;

// Items about the same topic get the same vector, so the vector search ranks
// them first. The topic is the first word of the feedback text.
function embeddingFor(text: string) {
  const topics = ["login", "darkmode", "billing"];
  const topic = text
    .replace(/^.*\| query: /, "")
    .split(" ")[0]
    .toLowerCase();
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
  vector[Math.max(topics.indexOf(topic), 0) + 1] = 1;
  return vector;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Fixtures follow the Gemini batchEmbedContents and Decisions API contracts.
function mockGemini(
  decide: (body: DecisionBody) => DecisionAnswers | Response,
) {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url, body });

    if (url.endsWith(":batchEmbedContents")) {
      return jsonResponse({
        embeddings: body.requests.map(
          (request: { content: { parts: Array<{ text: string }> } }) => ({
            values: embeddingFor(request.content.parts[0].text),
          }),
        ),
      });
    }

    if (url.endsWith("/decisions")) {
      const answers = decide(body);
      return answers instanceof Response ? answers : jsonResponse({ answers });
    }

    return jsonResponse({ error: "unexpected URL" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

// Acts like the model: an item joins the candidate that shares its topic.
function sameIssueChoice(body: DecisionBody) {
  const topic = body.input.replace("Feedback: ", "").split(" ")[0];
  const criteria = body.questions.same_issue?.criteria ?? {};
  return (
    Object.entries(criteria).find(([, text]) =>
      text.includes(`"${topic} `),
    )?.[0] ?? "other"
  );
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Missing test fixture.");
  }
  return value;
}

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const ids = await t.run(async (ctx) => {
    const customerId = await ctx.db.insert("customers", {
      name: "Triage Customer",
      slug: "triage-customer",
    });
    const customerAppId = await ctx.db.insert("customerApps", {
      customerId,
      name: "Triage App",
      clientKey: CLIENT_KEY,
      allowedOrigins: [ORIGIN],
    });
    return { customerId, customerAppId };
  });
  return { t, ...ids };
}

async function submit(
  t: Awaited<ReturnType<typeof setup>>["t"],
  content: string,
  type = "",
) {
  const response = await t.fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({
      clientKey: CLIENT_KEY,
      content,
      type,
      pageContext: { url: `${ORIGIN}/login?token=secret` },
    }),
  });
  expect(response.status).toBe(201);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  return (await response.json()) as { id: Id<"feedbackItems"> };
}

async function readState(t: Awaited<ReturnType<typeof setup>>["t"]) {
  return await t.run(async (ctx) => ({
    items: await ctx.db.query("feedbackItems").take(20),
    issues: await ctx.db.query("feedbackIssues").take(20),
    links: await ctx.db.query("issueCustomerApps").take(20),
    embeddings: await ctx.db.query("feedbackItemEmbeddings").take(20),
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI triage of Feedback Items", () => {
  it("classifies a new item and sends only text, page path and Reporter type", async () => {
    const calls = mockGemini(() => ({
      feedback_type: { choice: "bug_report", confidence: 0.95 },
    }));
    const { t } = await setup();

    await submit(t, "login button does nothing", "complaint");

    const { items, issues, embeddings } = await readState(t);
    expect(items[0]).toMatchObject({
      type: "bug_report",
      reporterType: "complaint",
      triage: { status: "done", typeConfidence: 0.95 },
    });
    expect(issues[0]).toMatchObject({
      primaryFeedbackType: "bug_report",
      needsReview: false,
    });
    expect(embeddings).toHaveLength(1);

    const decision = calls.find((call) => call.url.endsWith("/decisions"));
    expect(decision?.body).toMatchObject({
      input: [
        "Feedback: login button does nothing",
        "Page: /login",
        "Reporter-selected type (may be wrong or missing): complaint",
      ].join("\n"),
    });
    expect(JSON.stringify(calls)).not.toContain("token=secret");
  });

  it("moves an item into the matching issue and removes its own issue", async () => {
    mockGemini((body) => ({
      feedback_type: { choice: "bug_report", confidence: 0.9 },
      ...(body.questions.same_issue
        ? {
            same_issue: {
              choice: sameIssueChoice(body),
              confidence: 0.92,
            },
          }
        : {}),
    }));
    const { t, customerAppId } = await setup();

    await submit(t, "login button does nothing");
    await submit(t, "darkmode please");
    await submit(t, "login is dead on Safari");

    const { items, issues, links } = await readState(t);
    expect(issues).toHaveLength(2);
    const loginIssue = issues.find((issue) => issue.itemCount === 2);
    expect(loginIssue?.summary).toBe("login button does nothing");
    expect(
      items
        .filter((item) => item.content.startsWith("login"))
        .map((item) => item.issueId),
    ).toEqual([loginIssue?._id, loginIssue?._id]);
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.customerAppId)).toEqual([
      customerAppId,
      customerAppId,
    ]);
  });

  it("keeps an uncertain match in its own issue and flags it for review", async () => {
    mockGemini((body) => ({
      feedback_type: { choice: "bug_report", confidence: 0.9 },
      ...(body.questions.same_issue
        ? { same_issue: { choice: "issue_1", confidence: 0.55 } }
        : {}),
    }));
    const { t } = await setup();

    await submit(t, "login button does nothing");
    await submit(t, "login page looks odd");

    const { issues } = await readState(t);
    expect(issues).toHaveLength(2);
    expect(issues[1]).toMatchObject({ itemCount: 1, needsReview: true });
  });

  it("never moves or reclassifies an issue a User edited during triage", async () => {
    mockGemini(() => ({
      feedback_type: { choice: "bug_report", confidence: 0.9 },
    }));
    const { t } = await setup();
    await submit(t, "login button does nothing");
    const target = (await readState(t)).issues[0];

    const editedIssueId = await t.run(async (ctx) => {
      const issueId = await ctx.db.insert("feedbackIssues", {
        customerId: target.customerId,
        summary: "login slow",
        groupingKey: "question:login slow",
        status: "planned",
        priority: "high",
        primaryFeedbackType: "question",
        signalScore: 1,
        signalReasons: [],
        itemCount: 1,
        editedByUser: true,
        firstSubmittedAt: target.firstSubmittedAt,
        lastSubmittedAt: target.lastSubmittedAt,
      });
      const app = await ctx.db.query("customerApps").first();
      await ctx.db.insert("feedbackItems", {
        customerId: target.customerId,
        customerAppId: required(app)._id,
        issueId,
        clientKey: CLIENT_KEY,
        content: "login slow",
        type: "question",
        triage: { status: "pending" },
        media: [],
        submittedAt: target.lastSubmittedAt,
      });
      return issueId;
    });
    const item = required(
      (await readState(t)).items.find((doc) => doc.issueId === editedIssueId),
    );

    await t.mutation(internal.triage.applyResult, {
      itemId: item._id,
      type: "performance_issue",
      typeConfidence: 0.9,
      isTypeConfident: true,
      targetIssueId: target._id,
      groupingConfidence: 0.9,
      needsReview: false,
    });

    const { issues, items } = await readState(t);
    expect(issues.find((issue) => issue._id === editedIssueId)).toMatchObject({
      primaryFeedbackType: "question",
      status: "planned",
      priority: "high",
    });
    expect(items.find((doc) => doc._id === item._id)).toMatchObject({
      issueId: editedIssueId,
      type: "performance_issue",
      triage: { status: "done" },
    });
  });

  it("marks an edit from the Dashboard as reviewed by a User", async () => {
    mockGemini(() => ({
      feedback_type: { choice: "bug_report", confidence: 0.4 },
    }));
    const { t } = await setup();
    await t.mutation(api.feedback.ensureDemoData, {});
    // The unauthenticated Dashboard shows the demo Customer.
    const demoCustomerId = await t.run(async (ctx) => {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_slug", (q) => q.eq("slug", "demo"))
        .unique();
      return required(customer)._id;
    });
    const issueId = await t.run(async (ctx) =>
      ctx.db.insert("feedbackIssues", {
        customerId: demoCustomerId,
        summary: "x",
        groupingKey: "x",
        status: "open",
        priority: "unset",
        primaryFeedbackType: "bug_report",
        signalScore: 1,
        signalReasons: [],
        itemCount: 1,
        needsReview: true,
        firstSubmittedAt: "2026-01-01T00:00:00.000Z",
        lastSubmittedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    await t.mutation(api.dashboard.updateIssue, { issueId, priority: "low" });

    const issue = await t.run(async (ctx) => ctx.db.get(issueId));
    expect(issue).toMatchObject({ needsReview: false, editedByUser: true });
  });

  it("returns null for an issue removed by grouping", async () => {
    mockGemini(() => ({
      feedback_type: { choice: "bug_report", confidence: 0.9 },
    }));
    const { t } = await setup();
    await t.mutation(api.feedback.ensureDemoData, {});
    const removedIssueId = await t.run(async (ctx) => {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_slug", (q) => q.eq("slug", "demo"))
        .unique();
      const id = await ctx.db.insert("feedbackIssues", {
        customerId: required(customer)._id,
        summary: "gone",
        groupingKey: "gone",
        status: "open",
        priority: "unset",
        primaryFeedbackType: "other",
        signalScore: 1,
        signalReasons: [],
        itemCount: 1,
        firstSubmittedAt: "2026-01-01T00:00:00.000Z",
        lastSubmittedAt: "2026-01-01T00:00:00.000Z",
      });
      await ctx.db.delete(id);
      return id;
    });

    expect(
      await t.query(api.dashboard.getIssue, { issueId: removedIssueId }),
    ).toBeNull();
  });

  it("leaves the item in its issue and records the error when Gemini fails", async () => {
    mockGemini(() =>
      jsonResponse({ error: { message: "API key not valid" } }, 400),
    );
    const { t } = await setup();

    await submit(t, "login button does nothing", "bug_report");

    const { items, issues } = await readState(t);
    expect(items[0]).toMatchObject({
      type: "bug_report",
      triage: { status: "failed" },
    });
    expect(items[0].triage?.error).toContain("(400)");
    expect(issues).toHaveLength(1);
  });

  it("skips triage without calling Gemini when no API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const calls = mockGemini(() => ({}));
    const { t } = await setup();

    await submit(t, "login button does nothing", "bug_report");

    const { items } = await readState(t);
    expect(items[0].triage?.status).toBe("skipped");
    expect(calls).toHaveLength(0);
  });
});
