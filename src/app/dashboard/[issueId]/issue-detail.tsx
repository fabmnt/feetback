"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { buttonVariants } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const statuses = [
  "open",
  "planned",
  "in_progress",
  "resolved",
  "closed",
] as const;
const priorities = ["unset", "low", "medium", "high", "urgent"] as const;
const feedbackTypes = [
  "bug_report",
  "complaint",
  "security_concern",
  "improvement_suggestion",
  "performance_issue",
  "question",
  "other",
  "uncategorized",
] as const;

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
    return <main className="min-h-screen bg-[#f7f5ef] p-6">Loading...</main>;
  }

  if (issue === null) {
    return <main className="min-h-screen bg-[#f7f5ef] p-6">Not found.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#191917]">
      <header className="border-[#ded8ca] border-b bg-[#fffdf8]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
          <Link
            className={buttonVariants({ className: "w-fit", variant: "ghost" })}
            href="/dashboard"
          >
            <ArrowLeft data-icon="inline-start" />
            Dashboard
          </Link>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="font-semibold text-[#24736a] text-sm">
                Feedback Issue
              </p>
              <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal md:text-5xl">
                {issue.issue.summary}
              </h1>
            </div>
            <div className="rounded-lg border border-[#ded8ca] bg-[#f7f5ef] p-4">
              <div className="grid grid-cols-2 gap-3">
                <EditSelect
                  label="Status"
                  value={issue.issue.status}
                  values={statuses}
                  onChange={(status) =>
                    updateIssueField({
                      issueId: issue.issue._id,
                      status: status as (typeof statuses)[number],
                    })
                  }
                />
                <EditSelect
                  label="Priority"
                  value={issue.issue.priority}
                  values={priorities}
                  onChange={(priority) =>
                    updateIssueField({
                      issueId: issue.issue._id,
                      priority: priority as (typeof priorities)[number],
                    })
                  }
                />
                <div className="col-span-2">
                  <EditSelect
                    label="Primary Feedback Type"
                    value={issue.issue.primaryFeedbackType}
                    values={feedbackTypes}
                    onChange={(primaryFeedbackType) =>
                      updateIssueField({
                        issueId: issue.issue._id,
                        primaryFeedbackType:
                          primaryFeedbackType as (typeof feedbackTypes)[number],
                      })
                    }
                  />
                </div>
              </div>
              {updateError ? (
                <p className="mt-3 text-[#b42318] text-sm">{updateError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-4">
            <h2 className="font-semibold text-xl">Issue Signal</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {issue.issue.signalReasons.map((reason) => (
                <span
                  className="rounded-md bg-[#e7f3ee] px-2 py-1 text-[#1e5d54] text-sm"
                  key={reason}
                >
                  {reason}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-4">
            <h2 className="font-semibold text-xl">Evidence</h2>
            <div className="mt-4 grid gap-3">
              {issue.items.map((item) => (
                <article
                  className="rounded-lg border border-[#e5dece] bg-[#fdfbf5] p-4"
                  key={item._id}
                >
                  <div className="mb-2 flex flex-wrap gap-2 text-[#686a64] text-xs">
                    <span>{formatToken(item.type)}</span>
                    <span>{new Date(item.submittedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-base">{item.content}</p>
                  <ItemMedia media={item.media} />
                  {item.pageContext?.url ? (
                    <p className="mt-3 text-[#686a64] text-sm">
                      Page: {item.pageContext.url}
                    </p>
                  ) : null}
                  {item.selectedElement ? (
                    <p className="mt-1 text-[#686a64] text-sm">
                      Element: {item.selectedElement.tagName}
                      {item.selectedElement.label
                        ? `, ${item.selectedElement.label}`
                        : ""}
                    </p>
                  ) : null}
                  {item.reporterIdentity ? (
                    <p className="mt-1 text-[#686a64] text-sm">
                      Reporter:{" "}
                      {item.reporterIdentity.email ??
                        item.reporterIdentity.name ??
                        item.reporterIdentity.id}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-4">
            <div className="flex items-center gap-2">
              <Sparkles />
              <h2 className="font-semibold text-xl">Implementation Prompt</h2>
            </div>
            <pre className="mt-4 max-h-[560px] overflow-auto whitespace-pre-wrap rounded-md border border-[#e5dece] bg-[#191917] p-4 text-[#f7f5ef] text-sm">
              {issue.implementationPrompt}
            </pre>
            <CopyButton
              className="mt-3 w-full"
              value={issue.implementationPrompt}
            >
              Copy prompt
            </CopyButton>
          </section>
        </aside>
      </section>
    </main>
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
            className="h-auto w-full rounded-md border border-[#e5dece]"
          />
        ) : (
          <span
            key={entry.url}
            className="relative block h-24 w-24 overflow-hidden rounded-md border border-[#e5dece]"
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
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[#686a64]">{label}</span>
      <select
        className="h-9 rounded-md border border-[#d4cebf] bg-white px-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {formatToken(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatToken(value: string) {
  return value.replaceAll("_", " ");
}
