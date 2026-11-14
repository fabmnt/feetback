"use client";

import {
  type UsePaginatedQueryReturnType,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import Link from "next/link";
import { useEffect, useReducer } from "react";

import { FootprintIcon } from "@/components/footprint-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  FeedbackTypeOption,
  IssuePriority,
  IssueStatus,
} from "@/lib/feedback-types";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  EMPTY_INBOX_FILTERS,
  hasActiveInboxFilters,
  type InboxFilters,
  InboxFiltersBar,
} from "./inbox-filters";
import { IssueInboxRow } from "./issue-inbox-row";

const ISSUE_PAGE_SIZE = 24;

const SORT_TABS = [
  ["recency", "Latest"],
  ["signal", "Top signal"],
  ["item_count", "Most reported"],
] as const;

type Sort = (typeof SORT_TABS)[number][0];

type InboxState = { filters: InboxFilters; sort: Sort };

type InboxAction =
  | { type: "filter"; patch: Partial<InboxFilters> }
  | { type: "clear" }
  | { type: "sort"; sort: Sort };

function inboxReducer(state: InboxState, action: InboxAction): InboxState {
  if (action.type === "filter") {
    return { ...state, filters: { ...state.filters, ...action.patch } };
  }
  if (action.type === "clear") {
    return { ...state, filters: EMPTY_INBOX_FILTERS };
  }
  return { ...state, sort: action.sort };
}

function toQueryArgs({ filters, sort }: InboxState) {
  return {
    customerAppId: filters.customerAppId
      ? (filters.customerAppId as Id<"customerApps">)
      : undefined,
    status: filters.status ? (filters.status as IssueStatus) : undefined,
    priority: filters.priority
      ? (filters.priority as IssuePriority)
      : undefined,
    primaryFeedbackType: filters.primaryFeedbackType
      ? (filters.primaryFeedbackType as FeedbackTypeOption)
      : undefined,
    search: filters.search.trim() || undefined,
    sort,
  };
}

export function DashboardInbox() {
  const [state, dispatch] = useReducer(inboxReducer, {
    filters: EMPTY_INBOX_FILTERS,
    sort: "recency",
  });
  const ensureDemoData = useMutation(api.feedback.ensureDemoData);
  const apps = useQuery(api.customerApps.list);
  const issues = usePaginatedQuery(
    api.dashboard.listIssues,
    toQueryArgs(state),
    { initialNumItems: ISSUE_PAGE_SIZE },
  );
  // Every filter uses its own index on the backend, so sorting only applies
  // to the unfiltered Inbox.
  const isFiltered = hasActiveInboxFilters(state.filters);

  useEffect(() => {
    if (apps === undefined || apps.length > 0) {
      return;
    }

    void ensureDemoData({}).catch((error) => {
      console.error("Failed to initialize demo data", error);
    });
  }, [apps, ensureDemoData]);

  return (
    // On desktop the page fits the viewport and only the issue list scrolls.
    // 4rem + 1px is the Dashboard header: h-16 plus its bottom border.
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:h-[calc(100svh-4rem-1px)] lg:flex-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="brand-headline text-4xl">Inbox</h1>
        {isFiltered ? null : (
          <SortTabs
            value={state.sort}
            onChange={(sort) => dispatch({ type: "sort", sort })}
          />
        )}
      </div>

      <InboxFiltersBar
        apps={apps ?? []}
        filters={state.filters}
        onChange={(patch) => dispatch({ type: "filter", patch })}
        onClear={() => dispatch({ type: "clear" })}
      />

      <IssueList issues={issues} isFiltered={isFiltered} />
    </div>
  );
}

function SortTabs({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (sort: Sort) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sort issues"
      className="flex rounded-full bg-lilac p-1"
    >
      {SORT_TABS.map(([sort, label]) => (
        <button
          key={sort}
          type="button"
          role="tab"
          aria-selected={value === sort}
          onClick={() => onChange(sort)}
          className={cn(
            "h-8 rounded-full px-3 font-semibold text-sm transition-colors",
            value === sort
              ? "bg-card text-ink shadow-sm"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function IssueList({
  issues,
  isFiltered,
}: {
  issues: UsePaginatedQueryReturnType<typeof api.dashboard.listIssues>;
  isFiltered: boolean;
}) {
  if (issues.status === "LoadingFirstPage") {
    return <IssueListSkeleton />;
  }

  if (issues.results.length === 0) {
    return <EmptyInbox isFiltered={isFiltered} />;
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-line lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="divide-y divide-line">
        {issues.results.map((issue) => (
          <IssueInboxRow key={issue._id} issue={issue} />
        ))}
      </div>
      {issues.status === "CanLoadMore" ? (
        <div className="flex justify-center border-line border-t p-3">
          <Button
            variant="ghost"
            className="h-9 rounded-full px-4 font-bold"
            onClick={() => issues.loadMore(ISSUE_PAGE_SIZE)}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function IssueListSkeleton() {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-3xl bg-card ring-1 ring-line">
      {["first", "second", "third", "fourth"].map((row) => (
        <div key={row} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyInbox({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-line border-dashed px-6 py-12 text-center">
      <span className="flex gap-1 text-sun" aria-hidden="true">
        <FootprintIcon className="size-8 -rotate-12" />
        <FootprintIcon className="size-8 translate-y-3 rotate-12 -scale-x-100" />
      </span>
      <h3 className="mt-2 font-extrabold text-2xl">
        {isFiltered ? "No issues match" : "No footprints yet"}
      </h3>
      <p className="max-w-md text-ink-soft">
        {isFiltered
          ? "Try a different search or clear the filters."
          : "Send feedback from the demo Customer App, then come back to see your first Feedback Issue."}
      </p>
      {isFiltered ? null : (
        <Link
          href="/demo/customer-app"
          className="mt-2 inline-flex h-11 items-center rounded-full bg-grape px-5 font-bold text-white transition-colors hover:bg-grape-deep"
        >
          Open the demo app
        </Link>
      )}
    </div>
  );
}
