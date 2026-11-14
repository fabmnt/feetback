"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { FeedbackTypeSticker } from "@/components/feedback-type-sticker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FEEDBACK_TYPE_OPTIONS,
  type FeedbackTypeOption,
  formatToken,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type IssuePriority,
  type IssueStatus,
} from "@/lib/feedback-types";
import { formatRelativeTime } from "@/lib/relative-time";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { NeedsReviewSticker, PriorityFlag } from "../issue-badges";

export function DashboardIssueDetail({ issueId }: { issueId: string }) {
  const issue = useQuery(api.dashboard.getIssue, {
    issueId: issueId as Id<"feedbackIssues">,
  });
  const updateIssue = useMutation(api.dashboard.updateIssue);
  const [updateError, setUpdateError] = useState("");

  const updateIssueField = async (
    values: Parameters<typeof updateIssue>[0],
  ) => {
    setUpdateError("");

    try {
      await updateIssue(values);
    } catch (error) {
      console.error("Failed to update issue", error);
      setUpdateError("Issue update failed. Please try again.");
    }
  };

  if (issue === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-ink-soft">
        Loading issue...
      </div>
    );
  }

  if (issue === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-ink-soft">
          Feedback Issue not found. Its feedback may have been grouped into
          another issue.
        </p>
        <Link
          className="inline-flex h-10 items-center rounded-full border-2 border-ink px-5 font-bold transition-colors hover:bg-ink hover:text-paper"
          href="/dashboard"
        >
          Back to Inbox
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-8 sm:pt-10">
        <Link
          className="inline-flex items-center gap-1 font-semibold text-ink-soft text-sm hover:text-ink"
          href="/dashboard"
        >
          <ArrowLeft className="size-4" />
          Inbox
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FeedbackTypeSticker
            type={issue.issue.primaryFeedbackType}
            label={formatToken(issue.issue.primaryFeedbackType)}
            variant="subtle"
            className="capitalize"
          />
          {issue.issue.needsReview ? <NeedsReviewSticker /> : null}
          <PriorityFlag priority={issue.issue.priority} />
          <span className="text-ink-soft text-sm">
            {issue.issue.itemCount}{" "}
            {issue.issue.itemCount === 1 ? "report" : "reports"} · last{" "}
            {formatRelativeTime(issue.issue.lastSubmittedAt)}
          </span>
        </div>
        <h1 className="brand-headline mt-3 max-w-4xl text-4xl sm:text-5xl">
          {issue.issue.summary}
        </h1>
        {issue.issue.needsReview ? (
          <p className="mt-3 text-ink-soft text-sm">
            AI was unsure about the type or grouping. Any edit marks it as
            reviewed.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <EditSelect
            label="Status"
            value={issue.issue.status}
            values={ISSUE_STATUSES}
            onChange={(status) =>
              updateIssueField({
                issueId: issue.issue._id,
                status: status as IssueStatus,
              })
            }
          />
          <EditSelect
            label="Priority"
            value={issue.issue.priority}
            values={ISSUE_PRIORITIES}
            onChange={(priority) =>
              updateIssueField({
                issueId: issue.issue._id,
                priority: priority as IssuePriority,
              })
            }
          />
          <EditSelect
            label="Type"
            value={issue.issue.primaryFeedbackType}
            values={FEEDBACK_TYPE_OPTIONS}
            onChange={(primaryFeedbackType) =>
              updateIssueField({
                issueId: issue.issue._id,
                primaryFeedbackType: primaryFeedbackType as FeedbackTypeOption,
              })
            }
          />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        {updateError ? (
          <p className="text-destructive text-sm lg:col-span-2">
            {updateError}
          </p>
        ) : null}

        <div className="min-w-0">
          <section>
            <h2 className="font-extrabold text-xl">Issue Signal</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {issue.issue.signalReasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-lilac px-3 py-1 font-semibold text-sm"
                >
                  {reason}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-extrabold text-xl">Evidence</h2>
            <div className="mt-3 grid gap-3">
              {issue.items.map((item) => (
                <article
                  className="rounded-3xl rounded-bl-md bg-card p-5 ring-1 ring-line"
                  key={item._id}
                >
                  <p className="text-ink-soft text-xs">
                    {[
                      formatToken(item.type),
                      describeTriage(item),
                      new Date(item.submittedAt).toLocaleString(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 text-lg leading-snug">{item.content}</p>
                  <ItemMedia media={item.media} />
                  <ItemContext item={item} />
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-extrabold text-xl">
            <Sparkles className="size-5 text-grape" />
            Implementation Prompt
          </h2>
          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-2xl bg-night p-5 font-mono text-sm text-white leading-relaxed">
            {issue.implementationPrompt}
          </pre>
          <CopyButton
            className="h-10 self-start rounded-full bg-grape px-5 font-bold text-white hover:bg-grape-deep hover:text-white"
            variant="default"
            value={issue.implementationPrompt}
          >
            Copy prompt
          </CopyButton>
        </aside>
      </div>
    </>
  );
}

function describeTriage(item: Doc<"feedbackItems">) {
  const triage = item.triage;

  if (!triage) {
    return null;
  }
  if (triage.status === "pending") {
    return "AI classifying...";
  }
  if (triage.status === "failed") {
    return "AI triage failed";
  }
  if (triage.status === "skipped") {
    return "AI triage off";
  }

  const confidence =
    triage.typeConfidence === undefined
      ? ""
      : ` ${Math.round(triage.typeConfidence * 100)}%`;
  const reporterChoice =
    item.reporterType &&
    item.reporterType !== "uncategorized" &&
    item.reporterType !== item.type
      ? `, Reporter chose ${formatToken(item.reporterType)}`
      : "";

  return `AI${confidence}${reporterChoice}`;
}

type MediaEntry = {
  kind: "screenshot" | "uploaded_image";
  name?: string;
  width?: number;
  height?: number;
  url: string | null;
};

const SCREENSHOT_FALLBACK_WIDTH = 1200;
const SCREENSHOT_FALLBACK_HEIGHT = 750;

function ItemMedia({ media }: { media: MediaEntry[] }) {
  const withUrls = media.filter(
    (entry): entry is MediaEntry & { url: string } => entry.url !== null,
  );

  if (withUrls.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {withUrls.map((entry) =>
        entry.kind === "screenshot" ? (
          <Image
            key={entry.url}
            src={entry.url}
            alt="Screenshot attached to this Feedback Item"
            width={entry.width ?? SCREENSHOT_FALLBACK_WIDTH}
            height={entry.height ?? SCREENSHOT_FALLBACK_HEIGHT}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="h-auto w-full rounded-xl border border-line"
          />
        ) : (
          <span
            key={entry.url}
            className="relative block h-24 w-24 overflow-hidden rounded-xl border border-line"
          >
            <Image
              src={entry.url}
              alt={entry.name ?? "Uploaded image"}
              fill
              sizes="96px"
              className="object-cover"
            />
          </span>
        ),
      )}
    </div>
  );
}

function ItemContext({
  item,
}: {
  item: {
    pageContext?: { url?: string };
    selectedElement?: { tagName: string; label?: string } | null;
    reporterIdentity?: { id?: string; email?: string; name?: string };
    developmentContext?: { branch: string; commit: string };
  };
}) {
  const reporter = [
    item.reporterIdentity?.email,
    item.reporterIdentity?.name,
    item.reporterIdentity?.id,
  ].find(Boolean);

  const parts = [
    item.pageContext?.url ? `Page: ${item.pageContext.url}` : null,
    item.selectedElement
      ? `Element: ${item.selectedElement.tagName}${
          item.selectedElement.label ? `, ${item.selectedElement.label}` : ""
        }`
      : null,
    item.developmentContext
      ? `Branch: ${item.developmentContext.branch}`
      : null,
    item.developmentContext
      ? `Commit: ${item.developmentContext.commit}`
      : null,
    reporter ? `Reporter: ${reporter}` : null,
  ].filter((part) => part !== null);

  if (parts.length === 0) {
    return null;
  }

  return (
    <p className="mt-3 break-words text-ink-soft text-sm">
      {parts.join(" · ")}
    </p>
  );
}

function EditSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void | Promise<void>;
}) {
  const items = values.map((item) => ({
    label: formatToken(item),
    value: item,
  }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== null) {
          void onChange(nextValue);
        }
      }}
    >
      <SelectTrigger
        className="h-9 rounded-full border-line bg-card capitalize data-[size=default]:h-9"
        aria-label={label}
      >
        <span className="text-ink-soft">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="capitalize"
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
