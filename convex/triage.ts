// AI triage of a new Feedback Item: classify its Feedback Type and move it
// into an existing Feedback Issue describing the same problem. Runs in the
// background after a Feedback Submission; the item first lives in its own
// issue, so a failed or skipped triage leaves it visible and ungrouped.
import { v } from "convex/values";
import {
  FEEDBACK_TYPE_OPTIONS,
  FEEDBACK_TYPES,
} from "../src/lib/feedback-types";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { decide, embedText, hasGeminiApiKey } from "./lib/gemini";
import {
  buildIssueSignal,
  ensureIssueCustomerAppLink,
  signalInputFromItem,
} from "./lib/issues";
import {
  CANDIDATE_ISSUE_LIMIT,
  EXAMPLES_PER_CANDIDATE,
  SIMILAR_ITEM_LIMIT,
} from "./lib/triageConfig";
import {
  buildDecisionRequest,
  type CandidateIssue,
  interpretAnswers,
} from "./lib/triageDecision";
import { triageState } from "./schema";

const classifiedType = v.union(
  ...FEEDBACK_TYPES.map((type) => v.literal(type)),
);

const itemType = v.union(
  ...FEEDBACK_TYPE_OPTIONS.map((type) => v.literal(type)),
);

const candidateIssue = v.object({
  issueId: v.id("feedbackIssues"),
  examples: v.array(v.string()),
});

const MAX_ISSUE_APP_LINKS = 20;

export const processItem = internalAction({
  args: { itemId: v.id("feedbackItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.triage.loadItem, args);

    if (!item) {
      return null;
    }

    if (!hasGeminiApiKey()) {
      await ctx.runMutation(internal.triage.finishWithoutResult, {
        itemId: args.itemId,
        status: "skipped",
        error: "GEMINI_API_KEY is not set.",
      });
      return null;
    }

    try {
      const embedding = await embedText(item.content);
      const candidates = item.canJoinOtherIssue
        ? await findCandidateIssues(ctx, item, embedding)
        : [];
      const { input, questions } = buildDecisionRequest(item, candidates);
      const answers = await decide(input, questions);
      const result = interpretAnswers(answers, item, candidates);

      await ctx.runMutation(internal.triage.applyResult, {
        itemId: args.itemId,
        embedding,
        ...result,
      });
    } catch (error) {
      console.error("Feedback triage failed", args.itemId, error);
      await ctx.runMutation(internal.triage.finishWithoutResult, {
        itemId: args.itemId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  },
});

async function findCandidateIssues(
  ctx: ActionCtx,
  item: { customerId: Id<"customers">; issueId: Id<"feedbackIssues"> },
  embedding: number[],
): Promise<CandidateIssue[]> {
  const hits = await ctx.vectorSearch(
    "feedbackItemEmbeddings",
    "by_embedding",
    {
      vector: embedding,
      limit: SIMILAR_ITEM_LIMIT,
      filter: (q) => q.eq("customerId", item.customerId),
    },
  );

  return await ctx.runQuery(internal.triage.loadCandidateIssues, {
    customerId: item.customerId,
    excludeIssueId: item.issueId,
    embeddingIds: hits.map((hit) => hit._id),
  });
}

export const loadItem = internalQuery({
  args: { itemId: v.id("feedbackItems") },
  returns: v.union(
    v.object({
      customerId: v.id("customers"),
      issueId: v.id("feedbackIssues"),
      content: v.string(),
      pageUrl: v.optional(v.string()),
      reporterType: itemType,
      canJoinOtherIssue: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);

    if (!item || item.triage?.status !== "pending") {
      return null;
    }

    const issue = await ctx.db.get(item.issueId);

    return {
      customerId: item.customerId,
      issueId: item.issueId,
      content: item.content,
      pageUrl: toPagePath(item.pageContext?.url),
      reporterType: item.reporterType ?? item.type,
      // Items that joined an issue by exact duplicate text stay there.
      canJoinOtherIssue: issue?.itemCount === 1,
    };
  },
});

// Only the path is sent to the AI provider: query strings can hold tokens or
// personal data.
function toPagePath(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

export const loadCandidateIssues = internalQuery({
  args: {
    customerId: v.id("customers"),
    excludeIssueId: v.id("feedbackIssues"),
    embeddingIds: v.array(v.id("feedbackItemEmbeddings")),
  },
  returns: v.array(candidateIssue),
  handler: async (ctx, args) => {
    const issueIds: Array<Id<"feedbackIssues">> = [];

    for (const embeddingId of args.embeddingIds) {
      const embedding = await ctx.db.get(embeddingId);
      const item = embedding ? await ctx.db.get(embedding.itemId) : null;
      const isNewCandidate =
        item &&
        item.customerId === args.customerId &&
        item.issueId !== args.excludeIssueId &&
        !issueIds.includes(item.issueId);

      if (isNewCandidate) {
        issueIds.push(item.issueId);
      }
    }

    const candidates: CandidateIssue[] = [];

    for (const issueId of issueIds) {
      const issue = await ctx.db.get(issueId);

      if (!issue || issue.status === "closed") {
        continue;
      }

      const examples = await ctx.db
        .query("feedbackItems")
        .withIndex("by_issueId", (q) => q.eq("issueId", issueId))
        .take(EXAMPLES_PER_CANDIDATE);
      candidates.push({
        issueId,
        examples: examples.map((example) => example.content),
      });

      if (candidates.length === CANDIDATE_ISSUE_LIMIT) {
        break;
      }
    }

    return candidates;
  },
});

export const applyResult = internalMutation({
  args: {
    itemId: v.id("feedbackItems"),
    embedding: v.array(v.float64()),
    type: classifiedType,
    typeConfidence: v.number(),
    targetIssueId: v.union(v.id("feedbackIssues"), v.null()),
    groupingConfidence: v.optional(v.number()),
    needsReview: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);

    if (!item || item.triage?.status !== "pending") {
      return null;
    }

    const sourceIssue = await ctx.db.get(item.issueId);

    if (!sourceIssue) {
      throw new Error("Feedback Item has no Feedback Issue.");
    }

    await ctx.db.insert("feedbackItemEmbeddings", {
      customerId: item.customerId,
      itemId: item._id,
      embedding: args.embedding,
    });

    const target = args.targetIssueId
      ? await ctx.db.get(args.targetIssueId)
      : null;
    // Re-checked here because issues can change while the action runs.
    const canMove =
      target !== null &&
      target._id !== sourceIssue._id &&
      target.customerId === item.customerId &&
      target.status !== "closed" &&
      sourceIssue.itemCount === 1;
    const destination = canMove ? target : sourceIssue;
    const classifiedItem = { ...item, type: args.type };

    await ctx.db.patch(item._id, {
      type: args.type,
      issueId: destination._id,
      triage: {
        status: "done",
        typeConfidence: args.typeConfidence,
        groupingConfidence: args.groupingConfidence,
      },
    });

    const needsReview = Boolean(destination.needsReview) || args.needsReview;

    if (!canMove) {
      const isOnlyItem = sourceIssue.itemCount === 1;
      await ctx.db.patch(sourceIssue._id, {
        needsReview,
        ...(isOnlyItem
          ? {
              primaryFeedbackType: args.type,
              ...buildIssueSignal(signalInputFromItem(classifiedItem, 1)),
            }
          : {}),
      });
      return null;
    }

    const sourceLinks = await ctx.db
      .query("issueCustomerApps")
      .withIndex("by_issueId", (q) => q.eq("issueId", sourceIssue._id))
      .take(MAX_ISSUE_APP_LINKS);
    for (const link of sourceLinks) {
      await ctx.db.delete(link._id);
    }
    await ctx.db.delete(sourceIssue._id);

    await ensureIssueCustomerAppLink(
      ctx,
      item.customerId,
      target._id,
      item.customerAppId,
    );

    const nextItemCount = target.itemCount + 1;
    await ctx.db.patch(target._id, {
      itemCount: nextItemCount,
      needsReview,
      ...buildIssueSignal(signalInputFromItem(classifiedItem, nextItemCount)),
      primaryFeedbackType:
        target.primaryFeedbackType === "uncategorized"
          ? args.type
          : target.primaryFeedbackType,
      firstSubmittedAt:
        item.submittedAt < target.firstSubmittedAt
          ? item.submittedAt
          : target.firstSubmittedAt,
      lastSubmittedAt:
        item.submittedAt > target.lastSubmittedAt
          ? item.submittedAt
          : target.lastSubmittedAt,
    });

    return null;
  },
});

export const finishWithoutResult = internalMutation({
  args: {
    itemId: v.id("feedbackItems"),
    status: triageState.fields.status,
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);

    if (!item || item.triage?.status !== "pending") {
      return null;
    }

    await ctx.db.patch(item._id, {
      triage: { status: args.status, error: args.error },
    });
    return null;
  },
});
