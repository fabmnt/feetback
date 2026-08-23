"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ArrowUpRight, CircleDot, Inbox, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DashboardSidebar } from "./dashboard-sidebar";

const ALL_CUSTOMER_APPS = "all-customer-apps";
const ISSUE_PAGE_SIZE = 24;
const VISIBLE_SIGNAL_REASON_COUNT = 3;

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
const sortOptions = [
  ["signal", "Signal"],
  ["recency", "Recent"],
  ["item_count", "Count"],
] as const;

type Status = (typeof statuses)[number];
type Priority = (typeof priorities)[number];
type FeedbackType = (typeof feedbackTypes)[number];
type Sort = (typeof sortOptions)[number][0];

export function DashboardIssues() {
  const [customerAppId, setCustomerAppId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [primaryFeedbackType, setPrimaryFeedbackType] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("signal");
  const ensureDemoData = useMutation(api.feedback.ensureDemoData);
  const apps = useQuery(api.customerApps.list);
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
    initialNumItems: ISSUE_PAGE_SIZE,
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
    <div className="min-h-svh bg-background text-foreground">
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset className="min-h-svh">
          <header className="sticky top-0 border-b bg-background/95 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    Feetback dashboard
                  </p>
                  <h1 className="truncate font-heading font-semibold text-2xl">
                    Feedback Issues
                  </h1>
                </div>
              </div>
              <CustomerAppSelect
                apps={apps ?? []}
                value={customerAppId}
                onChange={setCustomerAppId}
              />
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
            <section className="grid gap-3 md:grid-cols-3">
              <Metric label="Issues" value={issues.results.length.toString()} />
              <Metric
                label="Customer Apps"
                value={apps ? apps.length.toString() : "..."}
              />
              <Metric label="Sort" value={formatToken(sort)} />
            </section>

            <section className="flex flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex min-h-8 flex-1 items-center gap-2 rounded-2xl bg-input/50 px-3">
                  <Search className="text-muted-foreground" />
                  <Input
                    className="border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0"
                    placeholder="Search issue summaries"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
                  <DashboardSelect
                    label="Status"
                    value={status}
                    values={statuses}
                    onChange={setStatus}
                  />
                  <DashboardSelect
                    label="Priority"
                    value={priority}
                    values={priorities}
                    onChange={setPriority}
                  />
                  <DashboardSelect
                    label="Type"
                    value={primaryFeedbackType}
                    values={feedbackTypes}
                    onChange={setPrimaryFeedbackType}
                  />
                  <DashboardSelect
                    label="Sort"
                    value={sort}
                    values={sortOptions.map(([value]) => value)}
                    onChange={(value) => setSort(value as Sort)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end">
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
                  Clear filters
                </Button>
              </div>
            </section>

            {issues.status === "LoadingFirstPage" ? (
              <IssueListSkeleton />
            ) : issues.results.length === 0 ? (
              <EmptyIssues />
            ) : (
              <section className="grid gap-3">
                {issues.results.map((issue) => (
                  <IssueRow key={issue._id} issue={issue} />
                ))}
              </section>
            )}

            {issues.status === "CanLoadMore" ? (
              <Button variant="outline" onClick={() => issues.loadMore(24)}>
                Load more
              </Button>
            ) : null}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

function CustomerAppSelect({
  apps,
  value,
  onChange,
}: {
  apps: Array<{ _id: Id<"customerApps">; name: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const items = [
    { label: "All customer apps", value: ALL_CUSTOMER_APPS },
    ...apps.map((app) => ({ label: app.name, value: app._id })),
  ];

  return (
    <Select
      items={items}
      value={value || ALL_CUSTOMER_APPS}
      onValueChange={(nextValue) =>
        onChange(nextValue === ALL_CUSTOMER_APPS ? "" : (nextValue ?? ""))
      }
    >
      <SelectTrigger className="w-full md:w-64">
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold text-2xl">{value}</div>
    </div>
  );
}

function DashboardSelect({
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
  const noneValue = `${label.toLowerCase()}-all`;
  const items = [
    { label: `${label}: Any`, value: noneValue },
    ...values.map((item) => ({ label: formatToken(item), value: item })),
  ];

  return (
    <Select
      items={items}
      value={value || noneValue}
      onValueChange={(nextValue) =>
        onChange(nextValue === noneValue ? "" : (nextValue ?? ""))
      }
    >
      <SelectTrigger className="w-full lg:w-36">
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
    <article className="rounded-lg border bg-card p-4 text-card-foreground transition hover:bg-muted/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {formatToken(issue.primaryFeedbackType)}
            </Badge>
            <Badge variant="outline">{formatToken(issue.status)}</Badge>
            <Badge
              variant={issue.priority === "urgent" ? "destructive" : "outline"}
            >
              Priority {formatToken(issue.priority)}
            </Badge>
          </div>
          <h2 className="font-heading font-semibold text-xl">
            {issue.summary}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-muted-foreground text-sm">
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
      <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {issue.signalReasons
            .slice(0, VISIBLE_SIGNAL_REASON_COUNT)
            .map((reason) => (
              <Badge variant="secondary" key={reason}>
                <CircleDot data-icon="inline-start" />
                {reason}
              </Badge>
            ))}
        </div>
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "self-start")}
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
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold text-2xl">{value}</div>
    </div>
  );
}

function IssueListSkeleton() {
  const rows = ["first", "second", "third"];

  return (
    <section className="grid gap-3">
      {rows.map((row) => (
        <Skeleton className="h-40 rounded-lg" key={row} />
      ))}
    </section>
  );
}

function EmptyIssues() {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center text-card-foreground">
      <Inbox className="text-muted-foreground" />
      <h2 className="mt-3 font-heading font-semibold text-xl">
        No Feedback Issues yet
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground text-sm">
        Submit feedback from the demo Customer App, then come back here to see
        the first issue grouping.
      </p>
    </section>
  );
}

function formatToken(value: string) {
  return value.replaceAll("_", " ");
}
