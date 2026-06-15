import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

const priority = v.union(
  v.literal("unset"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

const issueStatus = v.union(
  v.literal("open"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("closed"),
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

const elementContext = v.object({
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

const mediaMetadata = v.object({
  kind: v.union(v.literal("screenshot"), v.literal("uploaded_image")),
  name: v.optional(v.string()),
  contentType: v.optional(v.string()),
  size: v.optional(v.number()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  capturedAt: v.optional(v.string()),
});

export default defineSchema({
  customers: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

  customerApps: defineTable({
    customerId: v.id("customers"),
    name: v.string(),
    clientKey: v.string(),
    allowedOrigins: v.array(v.string()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_clientKey", ["clientKey"])
    .index("by_customerId_and_clientKey", ["customerId", "clientKey"]),

  users: defineTable({
    customerId: v.id("customers"),
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_customerId", ["customerId"]),

  feedbackIssues: defineTable({
    customerId: v.id("customers"),
    summary: v.string(),
    groupingKey: v.string(),
    status: issueStatus,
    priority,
    primaryFeedbackType: feedbackType,
    signalScore: v.number(),
    signalReasons: v.array(v.string()),
    itemCount: v.number(),
    firstSubmittedAt: v.string(),
    lastSubmittedAt: v.string(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_customerId_and_status", ["customerId", "status"])
    .index("by_customerId_and_priority", ["customerId", "priority"])
    .index("by_customerId_and_primaryFeedbackType", [
      "customerId",
      "primaryFeedbackType",
    ])
    .index("by_customerId_and_groupingKey", ["customerId", "groupingKey"])
    .index("by_customerId_and_lastSubmittedAt", [
      "customerId",
      "lastSubmittedAt",
    ])
    .index("by_customerId_and_signalScore", ["customerId", "signalScore"])
    .index("by_customerId_and_itemCount", ["customerId", "itemCount"])
    .searchIndex("search_summary", {
      searchField: "summary",
      filterFields: ["customerId"],
    }),

  issueCustomerApps: defineTable({
    customerId: v.id("customers"),
    issueId: v.id("feedbackIssues"),
    customerAppId: v.id("customerApps"),
  })
    .index("by_issueId", ["issueId"])
    .index("by_customerAppId", ["customerAppId"])
    .index("by_issueId_and_customerAppId", ["issueId", "customerAppId"]),

  feedbackItems: defineTable({
    customerId: v.id("customers"),
    customerAppId: v.id("customerApps"),
    issueId: v.id("feedbackIssues"),
    clientKey: v.string(),
    content: v.string(),
    type: feedbackType,
    reporterIdentity: v.optional(reporterIdentity),
    pageContext: v.optional(pageContext),
    selectedElement: v.optional(elementContext),
    media: v.array(mediaMetadata),
    submittedAt: v.string(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_issueId", ["issueId"])
    .index("by_customerAppId", ["customerAppId"])
    .index("by_customerId_and_submittedAt", ["customerId", "submittedAt"]),
});
