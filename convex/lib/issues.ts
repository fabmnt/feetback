import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type SignalInput = {
  nextItemCount: number;
  hasReporterIdentity: boolean;
  hasVisualContext: boolean;
  hasElementContext: boolean;
  type: string;
  content: string;
};

export function signalInputFromItem(
  item: Doc<"feedbackItems">,
  nextItemCount: number,
): SignalInput {
  return {
    nextItemCount,
    hasReporterIdentity: Boolean(item.reporterIdentity),
    hasVisualContext: item.media.length > 0,
    hasElementContext: Boolean(item.selectedElement),
    type: item.type,
    content: item.content,
  };
}

export function buildIssueSignal(input: SignalInput) {
  const signalReasons = buildSignalReasons(input);
  return {
    signalScore: signalReasons.length + input.nextItemCount,
    signalReasons,
  };
}

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

export async function ensureIssueCustomerAppLink(
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
