"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Inbox, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FEEDBACK_TYPE_OPTIONS,
  type FeedbackTypeOption,
  formatToken,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type IssuePriority,
  type IssueStatus,
} from "@/lib/feedback-types";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const ALL_CUSTOMER_APPS = "all-customer-apps";
const ISSUE_PAGE_SIZE = 24;

const sortOptions = [
  ["signal", "Signal"],
  ["recency", "Recent"],
  ["item_count", "Count"],
] as const;

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
      status: status ? (status as IssueStatus) : undefined,
      priority: priority ? (priority as IssuePriority) : undefined,
      primaryFeedbackType: primaryFeedbackType
        ? (primaryFeedbackType as FeedbackTypeOption)
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

  const hasActiveFilters = Boolean(
    customerAppId || status || priority || primaryFeedbackType || search,
  );

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <h1 className="truncate font-semibold text-xl">Feedback Issues</h1>
          </div>
          <CustomerAppSelect
            apps={apps ?? []}
            value={customerAppId}
            onChange={setCustomerAppId}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <section className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-h-8 flex-1 items-center gap-2 rounded-2xl bg-input/50 px-3">
            <Search className="text-muted-foreground" />
            <Input
              className="border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="Search issue summaries"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardSelect
              label="Status"
              items={ISSUE_STATUSES.map((value) => ({
                label: formatToken(value),
                value,
              }))}
              value={status}
              onChange={setStatus}
            />
            <DashboardSelect
              label="Priority"
              items={ISSUE_PRIORITIES.map((value) => ({
                label: formatToken(value),
                value,
              }))}
              value={priority}
              onChange={setPriority}
            />
            <DashboardSelect
              label="Type"
              items={FEEDBACK_TYPE_OPTIONS.map((value) => ({
                label: formatToken(value),
                value,
              }))}
              value={primaryFeedbackType}
              onChange={setPrimaryFeedbackType}
            />
            <DashboardSelect
              label="Sort"
              items={sortOptions.map(([value, label]) => ({ label, value }))}
              value={sort}
              onChange={(value) => setSort(value as Sort)}
            />
            {hasActiveFilters ? (
              <Button
                variant="ghost"
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
            ) : null}
          </div>
        </section>

        {issues.status === "LoadingFirstPage" ? (
          <IssueListSkeleton />
        ) : issues.results.length === 0 ? (
          <EmptyIssues />
        ) : (
          <section className="divide-y">
            {issues.results.map((issue) => (
              <IssueRow key={issue._id} issue={issue} />
            ))}
          </section>
        )}

        {issues.status === "CanLoadMore" ? (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => issues.loadMore(ISSUE_PAGE_SIZE)}
          >
            Load more
          </Button>
        ) : null}
      </div>
    </>
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
      <SelectTrigger className="w-full md:w-56">
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

function DashboardSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: ReadonlyArray<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const noneValue = `${label.toLowerCase()}-all`;
  const allItems = [{ label: `${label}: Any`, value: noneValue }, ...items];

  return (
    <Select
      items={allItems}
      value={value || noneValue}
      onValueChange={(nextValue) =>
        onChange(nextValue === noneValue ? "" : (nextValue ?? ""))
      }
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {allItems.map((item) => (
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
    status: IssueStatus;
    priority: IssuePriority;
    primaryFeedbackType: FeedbackTypeOption;
    signalScore: number;
    itemCount: number;
    lastSubmittedAt: string;
    affectedApps: Array<{ name: string; clientKey: string }>;
  };
}) {
  const itemCountLabel = `${issue.itemCount} ${issue.itemCount === 1 ? "item" : "items"}`;
  const meta = [
    formatToken(issue.primaryFeedbackType),
    formatToken(issue.status),
    issue.priority === "unset"
      ? null
      : `${formatToken(issue.priority)} priority`,
    itemCountLabel,
    `Signal ${issue.signalScore}`,
    ...issue.affectedApps.map((app) => app.name),
  ]
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <Link
      className="-mx-3 block rounded-lg px-3 py-4 transition-colors hover:bg-muted/40"
      href={`/dashboard/${issue._id}`}
    >
      <h2 className="font-medium">{issue.summary}</h2>
      <p className="mt-1 text-muted-foreground text-sm">{meta}</p>
    </Link>
  );
}

function IssueListSkeleton() {
  const rows = ["first", "second", "third"];

  return (
    <section className="grid gap-3">
      {rows.map((row) => (
        <Skeleton className="h-16 rounded-lg" key={row} />
      ))}
    </section>
  );
}

function EmptyIssues() {
  return (
    <section className="flex flex-col items-center gap-2 py-16 text-center">
      <Inbox className="text-muted-foreground" />
      <h2 className="font-semibold text-lg">No Feedback Issues yet</h2>
      <p className="max-w-md text-muted-foreground text-sm">
        Submit feedback from the demo Customer App, then come back here to see
        the first issue grouping.
      </p>
    </section>
  );
}
