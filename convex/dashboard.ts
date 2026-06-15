import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

const issueStatus = v.union(
  v.literal("open"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("closed"),
);

const priority = v.union(
  v.literal("unset"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

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

async function getDemoCustomerId(ctx: QueryCtx) {
  const customer = await ctx.db
    .query("customers")
    .withIndex("by_slug", (q) => q.eq("slug", "demo"))
    .unique();

  if (!customer) {
    return null;
  }

  return customer._id;
}

async function getViewerCustomerId(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return await getDemoCustomerId(ctx);
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (!user) {
    throw new Error("No Feetback User is linked to this identity.");
  }

  return user.customerId;
}

async function ensureIssueBelongsToViewer(
  ctx: QueryCtx,
  issueId: Id<"feedbackIssues">,
) {
  const customerId = await getViewerCustomerId(ctx);

  if (!customerId) {
    throw new Error("No Customer is available for this dashboard.");
  }

  const issue = await ctx.db.get(issueId);

  if (!issue || issue.customerId !== customerId) {
    throw new Error("Unauthorized");
  }

  return { customerId, issue };
}

async function affectedAppsForIssue(
  ctx: QueryCtx,
  issueId: Id<"feedbackIssues">,
) {
  const links = await ctx.db
    .query("issueCustomerApps")
    .withIndex("by_issueId", (q) => q.eq("issueId", issueId))
    .take(20);

  return await Promise.all(
    links.map(async (link) => {
      const app = await ctx.db.get(link.customerAppId);
      return app
        ? { id: app._id, name: app.name, clientKey: app.clientKey }
        : null;
    }),
  ).then((apps) => apps.filter((app) => app !== null));
}

export const listCustomerApps = query({
  args: {},
  handler: async (ctx) => {
    const customerId = await getViewerCustomerId(ctx);

    if (!customerId) {
      return [];
    }

    return await ctx.db
      .query("customerApps")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(50);
  },
});

export const listIssues = query({
  args: {
    customerAppId: v.optional(v.id("customerApps")),
    status: v.optional(issueStatus),
    priority: v.optional(priority),
    primaryFeedbackType: v.optional(feedbackType),
    search: v.optional(v.string()),
    sort: v.optional(
      v.union(
        v.literal("signal"),
        v.literal("recency"),
        v.literal("item_count"),
      ),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const customerId = await getViewerCustomerId(ctx);

    if (!customerId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    if (args.customerAppId) {
      const app = await ctx.db.get(args.customerAppId);

      if (!app || app.customerId !== customerId) {
        throw new Error("Unauthorized");
      }

      const links = await ctx.db
        .query("issueCustomerApps")
        .withIndex("by_customerAppId", (q) =>
          q.eq("customerAppId", args.customerAppId as Id<"customerApps">),
        )
        .take(args.paginationOpts.numItems);

      const issues = await Promise.all(
        links.map((link) => ctx.db.get(link.issueId)),
      );
      const page = await enrichIssues(
        ctx,
        issues.filter(
          (issue): issue is Doc<"feedbackIssues"> =>
            issue?.customerId === customerId,
        ),
        args,
      );

      return {
        page,
        isDone: true,
        continueCursor: "",
      };
    }

    const search = args.search?.trim();

    if (search) {
      const result = await ctx.db
        .query("feedbackIssues")
        .withSearchIndex("search_summary", (q) =>
          q.search("summary", search).eq("customerId", customerId),
        )
        .paginate(args.paginationOpts);

      return {
        ...result,
        page: await enrichIssues(ctx, result.page, args),
      };
    }

    if (args.status) {
      const status = args.status;
      const result = await ctx.db
        .query("feedbackIssues")
        .withIndex("by_customerId_and_status", (q) =>
          q.eq("customerId", customerId).eq("status", status),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      return {
        ...result,
        page: await enrichIssues(ctx, result.page, args),
      };
    }

    if (args.priority) {
      const selectedPriority = args.priority;
      const result = await ctx.db
        .query("feedbackIssues")
        .withIndex("by_customerId_and_priority", (q) =>
          q.eq("customerId", customerId).eq("priority", selectedPriority),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      return {
        ...result,
        page: await enrichIssues(ctx, result.page, args),
      };
    }

    if (args.primaryFeedbackType) {
      const selectedType = args.primaryFeedbackType;
      const result = await ctx.db
        .query("feedbackIssues")
        .withIndex("by_customerId_and_primaryFeedbackType", (q) =>
          q
            .eq("customerId", customerId)
            .eq("primaryFeedbackType", selectedType),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      return {
        ...result,
        page: await enrichIssues(ctx, result.page, args),
      };
    }

    const indexName =
      args.sort === "item_count"
        ? "by_customerId_and_itemCount"
        : args.sort === "recency"
          ? "by_customerId_and_lastSubmittedAt"
          : "by_customerId_and_signalScore";
    const result = await ctx.db
      .query("feedbackIssues")
      .withIndex(indexName, (q) => q.eq("customerId", customerId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await enrichIssues(ctx, result.page, args),
    };
  },
});

async function enrichIssues(
  ctx: QueryCtx,
  issues: Array<Doc<"feedbackIssues">>,
  args: {
    status?: Doc<"feedbackIssues">["status"];
    priority?: Doc<"feedbackIssues">["priority"];
    primaryFeedbackType?: Doc<"feedbackIssues">["primaryFeedbackType"];
  },
) {
  const filtered = issues.filter((issue) => {
    if (args.status && issue.status !== args.status) {
      return false;
    }
    if (args.priority && issue.priority !== args.priority) {
      return false;
    }
    if (
      args.primaryFeedbackType &&
      issue.primaryFeedbackType !== args.primaryFeedbackType
    ) {
      return false;
    }
    return true;
  });

  return await Promise.all(
    filtered.map(async (issue) => ({
      ...issue,
      affectedApps: await affectedAppsForIssue(ctx, issue._id),
    })),
  );
}

export const getIssue = query({
  args: {
    issueId: v.id("feedbackIssues"),
  },
  handler: async (ctx, args) => {
    const { issue } = await ensureIssueBelongsToViewer(ctx, args.issueId);
    const items = await ctx.db
      .query("feedbackItems")
      .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
      .order("desc")
      .take(50);
    const apps = await affectedAppsForIssue(ctx, issue._id);

    return {
      issue,
      affectedApps: apps,
      items,
      implementationPrompt: buildImplementationPrompt(issue, items, apps),
    };
  },
});

export const updateIssue = mutation({
  args: {
    issueId: v.id("feedbackIssues"),
    status: v.optional(issueStatus),
    priority: v.optional(priority),
    primaryFeedbackType: v.optional(feedbackType),
  },
  handler: async (ctx, args) => {
    const { issue } = await ensureIssueBelongsToViewer(ctx, args.issueId);

    await ctx.db.patch(issue._id, {
      ...(args.status ? { status: args.status } : {}),
      ...(args.priority ? { priority: args.priority } : {}),
      ...(args.primaryFeedbackType
        ? { primaryFeedbackType: args.primaryFeedbackType }
        : {}),
    });

    return await ctx.db.get(issue._id);
  },
});

function buildImplementationPrompt(
  issue: Doc<"feedbackIssues">,
  items: Array<Doc<"feedbackItems">>,
  apps: Array<{ name: string; clientKey: string }>,
) {
  const evidence = items
    .slice(0, 8)
    .map((item, index) => {
      const page = item.pageContext?.url
        ? `\nPage: ${item.pageContext.url}`
        : "";
      const element = item.selectedElement
        ? `\nElement: ${item.selectedElement.tagName}${
            item.selectedElement.label ? `, ${item.selectedElement.label}` : ""
          }`
        : "";

      return `${index + 1}. ${item.content}${page}${element}`;
    })
    .join("\n\n");

  return `Implement a fix for this Feetback Feedback Issue.

Issue summary:
${issue.summary}

Expected behavior:
Infer the intended behavior from the evidence, preserve the current product language, and keep the fix scoped to the affected Customer App surfaces.

Issue signal:
${issue.signalReasons.join("\n")}

Affected Customer Apps:
${apps.map((app) => `- ${app.name} (${app.clientKey})`).join("\n")}

Textual evidence:
${evidence}`;
}
