import type { FunctionReturnType } from "convex/server";
import Link from "next/link";

import { FeedbackTypeSticker } from "@/components/feedback-type-sticker";
import { formatToken } from "@/lib/feedback-types";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { api } from "../../../convex/_generated/api";
import {
  DONE_STATUSES,
  NeedsReviewSticker,
  PriorityFlag,
  StatusPill,
} from "./issue-badges";

export type InboxIssue = FunctionReturnType<
  typeof api.dashboard.listIssues
>["page"][number];

/** Two lines on small screens, one dense line from `lg` up. */
export function IssueInboxRow({ issue }: { issue: InboxIssue }) {
  const isDone = DONE_STATUSES.has(issue.status);
  const reportLabel = issue.itemCount === 1 ? "report" : "reports";
  const appNames = issue.affectedApps.map((app) => app.name).join(", ");

  return (
    <Link
      href={`/dashboard/${issue._id}`}
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-paper lg:items-center lg:py-2.5",
        isDone && "opacity-60 hover:opacity-100",
      )}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-xl bg-lilac font-extrabold text-sm"
        title={`${issue.itemCount} ${reportLabel}`}
      >
        {issue.itemCount}
        <span className="sr-only"> {reportLabel}</span>
      </span>

      <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-4">
        <p className="line-clamp-2 font-semibold leading-snug group-hover:text-grape-deep lg:line-clamp-1 lg:flex-1">
          {issue.summary}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-soft text-xs lg:mt-0 lg:flex-nowrap">
          {issue.needsReview ? <NeedsReviewSticker /> : null}
          <PriorityFlag priority={issue.priority} />
          <FeedbackTypeSticker
            type={issue.primaryFeedbackType}
            label={formatToken(issue.primaryFeedbackType)}
            variant="subtle"
            className="capitalize lg:w-40"
          />
          <StatusPill status={issue.status} />
          {appNames ? (
            <span className="truncate lg:w-28">{appNames}</span>
          ) : null}
          <time
            dateTime={issue.lastSubmittedAt}
            className="whitespace-nowrap lg:w-20 lg:text-right"
          >
            {formatRelativeTime(issue.lastSubmittedAt)}
          </time>
        </div>
      </div>
    </Link>
  );
}
