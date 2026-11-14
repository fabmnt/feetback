import type { FeedbackTypeOption } from "@/lib/feedback-types";
import { cn } from "@/lib/utils";

/**
 * One sticker color per Feedback Type, shared by the landing page and the
 * Dashboard. Filled stickers use `night` because `ink` turns light in dark mode.
 */
const FEEDBACK_TYPE_STICKER_STYLES: Record<FeedbackTypeOption, string> = {
  bug_report: "bg-pink text-white",
  complaint: "bg-grape text-white",
  security_concern: "bg-night text-white",
  improvement_suggestion: "bg-sun text-night",
  performance_issue: "bg-mint text-night",
  question: "bg-sky text-night",
  other: "bg-lilac text-ink",
  uncategorized: "border border-dashed border-ink-soft/40 text-ink-soft",
};

/** Dot colors for the subtle variant, matching the sticker colors. */
const FEEDBACK_TYPE_DOT_STYLES: Record<FeedbackTypeOption, string> = {
  bug_report: "bg-pink",
  complaint: "bg-grape",
  security_concern: "bg-ink",
  improvement_suggestion: "bg-sun",
  performance_issue: "bg-mint",
  question: "bg-sky",
  other: "bg-ink-soft/40",
  uncategorized: "border border-ink-soft/50 border-dashed",
};

/**
 * `sticker` is the bold, filled look of the landing page; `subtle` is a
 * neutral label with a small colored dot, for dense Dashboard lists.
 */
export function FeedbackTypeSticker({
  type,
  label,
  variant = "sticker",
  className,
}: {
  type: FeedbackTypeOption;
  label: string;
  variant?: "sticker" | "subtle";
  className?: string;
}) {
  if (variant === "subtle") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium text-ink-soft text-xs",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", FEEDBACK_TYPE_DOT_STYLES[type])}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 font-bold text-xs",
        FEEDBACK_TYPE_STICKER_STYLES[type],
        className,
      )}
    >
      {label}
    </span>
  );
}
