import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";

const feedbackType = v.union(
  v.literal("bug_report"),
  v.literal("complaint"),
  v.literal("security_concern"),
  v.literal("improvement_suggestion"),
  v.literal("performance_issue"),
  v.literal("question"),
  v.literal("other"),
  v.literal("uncategorized"),
);

const reporterIdentity = v.object({
  id: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
});

const pageContext = v.object({
  url: v.optional(v.string()),
  title: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  timestamp: v.optional(v.string()),
  viewport: v.optional(
    v.object({
      width: v.number(),
      height: v.number(),
    }),
  ),
});

const selectedElement = v.object({
  tagName: v.string(),
  label: v.optional(v.string()),
  selectorPath: v.optional(v.string()),
  boundingBox: v.optional(
    v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
  ),
  highlightContext: v.optional(v.string()),
});

const screenshot = v.object({
  dataUrl: v.string(),
  capturedAt: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
});

const uploadedImage = v.object({
  name: v.string(),
  type: v.string(),
  size: v.number(),
  dataUrl: v.string(),
});

export const ensureDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureDemoApp(ctx);
  },
});

export const submitPublic = mutation({
  args: {
    clientKey: v.string(),
    content: v.string(),
    type: feedbackType,
    reporterIdentity: v.optional(reporterIdentity),
    pageContext: v.optional(pageContext),
    screenshot: v.optional(v.union(screenshot, v.null())),
    selectedElement: v.optional(v.union(selectedElement, v.null())),
    uploadedImages: v.optional(v.array(uploadedImage)),
    requestOrigin: v.optional(v.union(v.string(), v.null())),
    submittedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const customerApp =
      (await ctx.db
        .query("customerApps")
        .withIndex("by_clientKey", (q) => q.eq("clientKey", args.clientKey))
        .unique()) ??
      (isDemoClientKey(args.clientKey) ? await ensureDemoApp(ctx) : null);

    if (!customerApp) {
      throw new Error("Unknown Client Key.");
    }

    if (
      customerApp.allowedOrigins.length > 0 &&
      args.requestOrigin &&
      !customerApp.allowedOrigins.includes(args.requestOrigin)
    ) {
      throw new Error("Origin is not allowed for this Client Key.");
    }

    const groupingKey = buildGroupingKey(args.content, args.type);
    const existingIssue = await ctx.db
      .query("feedbackIssues")
      .withIndex("by_customerId_and_groupingKey", (q) =>
        q
          .eq("customerId", customerApp.customerId)
          .eq("groupingKey", groupingKey),
      )
      .unique();

    const issueId = existingIssue
      ? existingIssue._id
      : await ctx.db.insert("feedbackIssues", {
          customerId: customerApp.customerId,
          summary: summarizeContent(args.content),
          groupingKey,
          status: "open",
          priority: "unset",
          primaryFeedbackType: args.type,
          signalScore: 1,
          signalReasons: ["1 Feedback Item"],
          itemCount: 0,
          firstSubmittedAt: args.submittedAt,
          lastSubmittedAt: args.submittedAt,
        });

    const itemId = await ctx.db.insert("feedbackItems", {
      customerId: customerApp.customerId,
      customerAppId: customerApp._id,
      issueId,
      clientKey: args.clientKey,
      content: args.content,
      type: args.type,
      reporterIdentity: args.reporterIdentity,
      pageContext: args.pageContext,
      selectedElement: args.selectedElement ?? undefined,
      media: buildMediaMetadata(args),
      submittedAt: args.submittedAt,
    });

    const issue = await ctx.db.get(issueId);

    if (!issue) {
      throw new Error("Feedback Issue could not be loaded after creation.");
    }

    await ensureIssueCustomerAppLink(
      ctx,
      customerApp.customerId,
      issueId,
      customerApp._id,
    );

    await ctx.db.patch(issueId, {
      itemCount: issue.itemCount + 1,
      signalScore: calculateSignalScore({
        nextItemCount: issue.itemCount + 1,
        hasReporterIdentity: Boolean(args.reporterIdentity),
        hasVisualContext: Boolean(
          args.screenshot || args.uploadedImages?.length,
        ),
        hasElementContext: Boolean(args.selectedElement),
        type: args.type,
        content: args.content,
      }),
      signalReasons: buildSignalReasons({
        nextItemCount: issue.itemCount + 1,
        hasReporterIdentity: Boolean(args.reporterIdentity),
        hasVisualContext: Boolean(
          args.screenshot || args.uploadedImages?.length,
        ),
        hasElementContext: Boolean(args.selectedElement),
        type: args.type,
        content: args.content,
      }),
      primaryFeedbackType:
        issue.primaryFeedbackType === "uncategorized"
          ? args.type
          : issue.primaryFeedbackType,
      lastSubmittedAt: args.submittedAt,
    });

    const item = await ctx.db.get(itemId);

    if (!item) {
      throw new Error("Feedback Item could not be loaded after creation.");
    }

    return toPublicFeedbackItem(item);
  },
});

async function ensureDemoApp(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("customerApps")
    .withIndex("by_clientKey", (q) => q.eq("clientKey", "demo_customer_app"))
    .unique();

  if (existing) {
    return existing;
  }

  const existingCustomer = await ctx.db
    .query("customers")
    .withIndex("by_slug", (q) => q.eq("slug", "demo"))
    .unique();
  const customerId =
    existingCustomer?._id ??
    (await ctx.db.insert("customers", {
      name: "Demo Customer",
      slug: "demo",
    }));

  const appId = await ctx.db.insert("customerApps", {
    customerId,
    name: "Acme Console",
    clientKey: "demo_customer_app",
    allowedOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://feetback.test",
    ],
  });
  const app = await ctx.db.get(appId);

  if (!app) {
    throw new Error("Demo Customer App could not be created.");
  }

  return app;
}

async function ensureIssueCustomerAppLink(
  ctx: MutationCtx,
  customerId: Id<"customers">,
  issueId: Id<"feedbackIssues">,
  customerAppId: Id<"customerApps">,
) {
  const existing = await ctx.db
    .query("issueCustomerApps")
    .withIndex("by_issueId_and_customerAppId", (q) =>
      q.eq("issueId", issueId).eq("customerAppId", customerAppId),
    )
    .unique();

  if (existing) {
    return existing._id;
  }

  return await ctx.db.insert("issueCustomerApps", {
    customerId,
    issueId,
    customerAppId,
  });
}

function isDemoClientKey(clientKey: string) {
  return clientKey === "demo_customer_app" || clientKey === "customer-app-demo";
}

function summarizeContent(content: string) {
  const compact = content.trim().replace(/\s+/g, " ");
  return compact.length > 96 ? `${compact.slice(0, 93)}...` : compact;
}

function buildGroupingKey(content: string, type: string) {
  return `${type}:${summarizeContent(content).toLowerCase()}`;
}

function buildMediaMetadata(args: {
  screenshot?: { capturedAt: string; width?: number; height?: number } | null;
  uploadedImages?: Array<{ name: string; type: string; size: number }>;
}) {
  return [
    ...(args.screenshot
      ? [
          {
            kind: "screenshot" as const,
            capturedAt: args.screenshot.capturedAt,
            width: args.screenshot.width,
            height: args.screenshot.height,
          },
        ]
      : []),
    ...(args.uploadedImages ?? []).map((image) => ({
      kind: "uploaded_image" as const,
      name: image.name,
      contentType: image.type,
      size: image.size,
    })),
  ];
}

function calculateSignalScore(input: SignalInput) {
  return buildSignalReasons(input).length + input.nextItemCount;
}

type SignalInput = {
  nextItemCount: number;
  hasReporterIdentity: boolean;
  hasVisualContext: boolean;
  hasElementContext: boolean;
  type: string;
  content: string;
};

function buildSignalReasons(input: SignalInput) {
  const reasons = [
    `${input.nextItemCount} Feedback Item${input.nextItemCount === 1 ? "" : "s"}`,
  ];

  if (input.hasVisualContext) {
    reasons.push("Includes visual context");
  }
  if (input.hasElementContext) {
    reasons.push("Includes Selected Element context");
  }
  if (input.hasReporterIdentity) {
    reasons.push("Includes Reporter Identity for follow-up");
  }
  if (
    input.type === "security_concern" ||
    input.type === "bug_report" ||
    input.type === "performance_issue"
  ) {
    reasons.push(`Feedback Type: ${input.type.replaceAll("_", " ")}`);
  }
  if (
    /\b(data loss|payment|security|broken|can't|cannot|blocked|urgent)\b/i.test(
      input.content,
    )
  ) {
    reasons.push("Contains severity hints");
  }

  return reasons;
}

function toPublicFeedbackItem(item: Doc<"feedbackItems">) {
  return {
    id: item._id,
    clientKey: item.clientKey,
    content: item.content,
    type: item.type,
    reporterIdentity: item.reporterIdentity,
    pageContext: item.pageContext,
    screenshot: item.media.find((media) => media.kind === "screenshot") ?? null,
    selectedElement: item.selectedElement ?? null,
    uploadedImages: item.media
      .filter((media) => media.kind === "uploaded_image")
      .map((media) => ({
        name: media.name,
        type: media.contentType,
        size: media.size,
      })),
    submittedAt: item.submittedAt,
  };
}
