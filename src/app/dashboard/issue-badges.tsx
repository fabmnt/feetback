import { Flag, Flame } from "lucide-react";

import {
  formatToken,
  type IssuePriority,
  type IssueStatus,
} from "@/lib/feedback-types";
import { cn } from "@/lib/utils";

export const DONE_STATUSES: ReadonlySet<IssueStatus> = new Set([
  "resolved",
  "closed",
]);

const STATUS_STYLES: Record<IssueStatus, string> = {
  open: "bg-card text-ink ring-1 ring-line",
  planned: "bg-sky/15 text-ink",
  in_progress: "bg-grape/10 text-grape-deep",
  resolved: "bg-mint/20 text-ink",
  closed: "bg-ink/5 text-ink-soft",
};

const PRIORITY_STYLES: Record<Exclude<IssuePriority, "unset">, string> = {
  urgent: "text-pink",
  high: "text-pink",
  medium: "text-ink",
  low: "text-ink-soft",
};

export function StatusPill({ status }: { status: IssueStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 font-semibold text-xs capitalize",
        STATUS_STYLES[status],
      )}
    >
      {formatToken(status)}
    </span>
  );
}

export function PriorityFlag({ priority }: { priority: IssuePriority }) {
  if (priority === "unset") {
    return null;
  }

  const Icon = priority === "urgent" ? Flame : Flag;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-bold text-xs capitalize",
        PRIORITY_STYLES[priority],
      )}
    >
      <Icon className="size-3.5" />
      {priority}
    </span>
  );
}

/** Marks issues where AI triage was unsure and a User should take a look. */
export function NeedsReviewSticker() {
  return (
    <span className="inline-flex -rotate-2 items-center whitespace-nowrap rounded-full bg-sun px-2 py-0.5 font-bold text-night text-xs">
      Needs review
    </span>
  );
}
