"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  CircleDot,
  Filter,
  Inbox,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

type Status = (typeof statuses)[number];
type Priority = (typeof priorities)[number];
type FeedbackType = (typeof feedbackTypes)[number];

export function DashboardIssues() {
  const [customerAppId, setCustomerAppId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [primaryFeedbackType, setPrimaryFeedbackType] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"signal" | "recency" | "item_count">(
    "signal",
  );
  const ensureDemoData = useMutation(api.feedback.ensureDemoData);
  const apps = useQuery(api.dashboard.listCustomerApps);
  const queryArgs = useMemo(
    () => ({
      customerAppId: customerAppId
        ? (customerAppId as Id<"customerApps">)
        : undefined,
      status: status ? (status as Status) : undefined,
      priority: priority ? (priority as Priority) : undefined,
      primaryFeedbackType: primaryFeedbackType
        ? (primaryFeedbackType as FeedbackType)
        : undefined,
      search: search.trim() || undefined,
      sort,
    }),
    [customerAppId, primaryFeedbackType, priority, search, sort, status],
  );
  const issues = usePaginatedQuery(api.dashboard.listIssues, queryArgs, {
    initialNumItems: 24,
  });

  useEffect(() => {
    if (apps === undefined || apps.length > 0) {
      return;
    }

    void ensureDemoData({}).catch((error) => {
      console.error("Failed to initialize demo data", error);
    });
  }, [apps, ensureDemoData]);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#191917]">
      <header className="border-[#ded8ca] border-b bg-[#fffdf8]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="font-semibold text-[#24736a] text-sm">
              Feetback dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
              Feedback Issues, ranked by evidence
            </h1>
            <p className="mt-3 max-w-2xl text-[#5e615c] text-base">
              Review grouped Feedback Items across Customer Apps, separate Issue
              Signal from Priority, and copy text-only Implementation Prompts.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#ded8ca] bg-[#f7f5ef] text-sm">
            <Metric label="Issues" value={issues.results.length.toString()} />
            <Metric
              label="Apps"
              value={apps ? apps.length.toString() : "..."}
            />
            <Metric label="Mode" value="v1" />
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
              <Filter />
              Filters
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[#686a64]">Customer App</span>
                <select
                  className="h-9 rounded-md border border-[#d4cebf] bg-white px-2"
                  value={customerAppId}
                  onChange={(event) => setCustomerAppId(event.target.value)}
                >
                  <option value="">All apps</option>
                  {(apps ?? []).map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </label>
              <SelectFilter
                label="Issue Status"
                value={status}
                values={statuses}
                onChange={setStatus}
              />
              <SelectFilter
                label="Priority"
                value={priority}
                values={priorities}
                onChange={setPriority}
              />
              <SelectFilter
                label="Primary Feedback Type"
                value={primaryFeedbackType}
                values={feedbackTypes}
                onChange={setPrimaryFeedbackType}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
              <ChartNoAxesColumnIncreasing />
              Sort
            </div>
            <div className="grid grid-cols-3 rounded-md border border-[#d4cebf] bg-[#f7f5ef] p-1">
              {[
                ["signal", "Signal"],
                ["recency", "Recent"],
                ["item_count", "Count"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={cn(
                    "h-8 rounded-sm px-2 text-sm transition",
                    sort === value && "bg-[#191917] text-white",
                  )}
                  type="button"
                  onClick={() => setSort(value as typeof sort)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-3 md:flex-row md:items-center">
            <div className="flex min-h-10 flex-1 items-center gap-2 rounded-md border border-[#d4cebf] bg-white px-3">
              <Search />
              <input
                className="h-9 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search issue summaries"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setCustomerAppId("");
                setStatus("");
                setPriority("");
                setPrimaryFeedbackType("");
                setSearch("");
              }}
            >
              Clear
            </Button>
          </div>

          {issues.status === "LoadingFirstPage" ? (
            <IssueListSkeleton />
          ) : issues.results.length === 0 ? (
            <EmptyIssues />
          ) : (
            <div className="grid gap-3">
              {issues.results.map((issue) => (
                <IssueRow key={issue._id} issue={issue} />
              ))}
            </div>
          )}

          {issues.status === "CanLoadMore" ? (
            <Button variant="outline" onClick={() => issues.loadMore(24)}>
              Load more
            </Button>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 border-[#ded8ca] border-r px-4 py-3 last:border-r-0">
      <div className="text-[#686a64] text-xs">{label}</div>
      <div className="mt-1 font-semibold text-xl">{value}</div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[#686a64]">{label}</span>
      <select
        className="h-9 rounded-md border border-[#d4cebf] bg-white px-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Any</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {formatToken(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function IssueRow({
  issue,
}: {
  issue: {
    _id: Id<"feedbackIssues">;
    summary: string;
    status: Status;
    priority: Priority;
    primaryFeedbackType: FeedbackType;
    signalScore: number;
    signalReasons: string[];
    itemCount: number;
    lastSubmittedAt: string;
    affectedApps: Array<{ name: string; clientKey: string }>;
  };
}) {
  return (
    <article className="rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-4 shadow-[0_1px_0_rgba(25,25,23,0.04)] transition hover:border-[#9eb7aa]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill tone="green">{formatToken(issue.primaryFeedbackType)}</Pill>
            <Pill>{formatToken(issue.status)}</Pill>
            <Pill tone={issue.priority === "urgent" ? "red" : "neutral"}>
              Priority {formatToken(issue.priority)}
            </Pill>
          </div>
          <h2 className="text-xl font-semibold tracking-normal">
            {issue.summary}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-[#686a64] text-sm">
            {issue.affectedApps.map((app) => (
              <span key={app.clientKey}>{app.name}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:w-56">
          <SignalBox label="Signal" value={issue.signalScore.toString()} />
          <SignalBox label="Items" value={issue.itemCount.toString()} />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-[#eee8da] border-t pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {issue.signalReasons.slice(0, 3).map((reason) => (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-[#eef5ee] px-2 py-1 text-[#37584e] text-xs"
              key={reason}
            >
              <CircleDot />
              {reason}
            </span>
          ))}
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={`/dashboard/${issue._id}`}
        >
          Open
          <ArrowUpRight data-icon="inline-end" />
        </Link>
      </div>
    </article>
  );
}

function SignalBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e5dece] bg-[#f7f5ef] px-3 py-2">
      <div className="text-[#686a64] text-xs">{label}</div>
      <div className="font-semibold text-2xl">{value}</div>
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md border px-2 text-xs",
        tone === "neutral" && "border-[#d8d1c1] bg-[#f7f5ef] text-[#514f49]",
        tone === "green" && "border-[#a8cabe] bg-[#e7f3ee] text-[#1e5d54]",
        tone === "red" && "border-[#e4b0a2] bg-[#fff0ec] text-[#9b321e]",
      )}
    >
      {children}
    </span>
  );
}

function IssueListSkeleton() {
  const rows = ["first", "second", "third"];

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div
          className="h-40 animate-pulse rounded-lg border border-[#ded8ca] bg-[#fffdf8]"
          key={row}
        />
      ))}
    </div>
  );
}

function EmptyIssues() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-[#ded8ca] bg-[#fffdf8] p-8 text-center">
      <Inbox />
      <h2 className="mt-3 font-semibold text-xl">No Feedback Issues yet</h2>
      <p className="mt-2 max-w-md text-[#686a64] text-sm">
        Submit feedback from the demo Customer App, then come back here to see
        the first issue grouping.
      </p>
    </div>
  );
}

function formatToken(value: string) {
  return value.replaceAll("_", " ");
}
