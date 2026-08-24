"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

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
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (issue === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Feedback Issue not found.</p>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/dashboard"
        >
          Back to Issues
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <Link
                className="text-muted-foreground text-sm hover:text-foreground"
                href="/dashboard"
              >
                <ArrowLeft className="mr-1 inline-block size-3.5 align-[-2px]" />
                Issues
              </Link>
              <h1 className="truncate font-semibold text-xl">
                {issue.issue.summary}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
                  primaryFeedbackType:
                    primaryFeedbackType as FeedbackTypeOption,
                })
              }
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-5 md:px-6 lg:grid-cols-[1fr_340px]">
        {updateError ? (
          <p className="text-destructive text-sm lg:col-span-2">
            {updateError}
          </p>
        ) : null}

        <div className="min-w-0">
          <section>
            <h2 className="font-semibold">Issue Signal</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {issue.issue.signalReasons.map((reason) => (
                <Badge key={reason} variant="secondary">
                  {reason}
                </Badge>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-semibold">Evidence</h2>
            <div className="mt-2 divide-y">
              {issue.items.map((item) => (
                <article className="py-4 first:pt-0" key={item._id}>
                  <p className="text-muted-foreground text-xs">
                    {formatToken(item.type)} ·{" "}
                    {new Date(item.submittedAt).toLocaleString()}
                  </p>
                  <p className="mt-2">{item.content}</p>
                  <ItemMedia media={item.media} />
                  <ItemContext item={item} />
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4" />
            Implementation Prompt
          </h2>
          <pre className="max-h-[560px] overflow-auto rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
            {issue.implementationPrompt}
          </pre>
          <CopyButton className="self-start" value={issue.implementationPrompt}>
            Copy prompt
          </CopyButton>
        </aside>
      </div>
    </>
  );
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
            className="h-auto w-full rounded-md border"
          />
        ) : (
          <span
            key={entry.url}
            className="relative block h-24 w-24 overflow-hidden rounded-md border"
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
    reporter ? `Reporter: ${reporter}` : null,
  ].filter((part) => part !== null);

  if (parts.length === 0) {
    return null;
  }

  return (
    <p className="mt-2 text-muted-foreground text-sm">{parts.join(" · ")}</p>
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
      <SelectTrigger className="w-full md:w-32" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
