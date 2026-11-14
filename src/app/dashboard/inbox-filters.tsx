"use client";

import { Search, X } from "lucide-react";

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
import {
  FEEDBACK_TYPE_OPTIONS,
  formatToken,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
} from "@/lib/feedback-types";
import type { Id } from "../../../convex/_generated/dataModel";

export type InboxFilters = {
  customerAppId: string;
  status: string;
  priority: string;
  primaryFeedbackType: string;
  search: string;
};

export const EMPTY_INBOX_FILTERS: InboxFilters = {
  customerAppId: "",
  status: "",
  priority: "",
  primaryFeedbackType: "",
  search: "",
};

export function hasActiveInboxFilters(filters: InboxFilters) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

const TRIGGER_CLASS =
  "h-9 rounded-full border-line bg-card data-[size=default]:h-9";

function toItems(values: readonly string[]) {
  return values.map((value) => {
    const label = formatToken(value);
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value };
  });
}

export function InboxFiltersBar({
  apps,
  filters,
  onChange,
  onClear,
}: {
  apps: Array<{ _id: Id<"customerApps">; name: string }>;
  filters: InboxFilters;
  onChange: (patch: Partial<InboxFilters>) => void;
  onClear: () => void;
}) {
  return (
    <section className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-card px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-grape">
        <Search className="size-4 shrink-0 text-ink-soft" />
        <Input
          aria-label="Search issues"
          className="h-full border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          placeholder="Search issues"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="App"
          anyLabel="All apps"
          items={apps.map((app) => ({ label: app.name, value: app._id }))}
          value={filters.customerAppId}
          onChange={(customerAppId) => onChange({ customerAppId })}
        />
        <FilterSelect
          label="Status"
          items={toItems(ISSUE_STATUSES)}
          value={filters.status}
          onChange={(status) => onChange({ status })}
        />
        <FilterSelect
          label="Priority"
          items={toItems(ISSUE_PRIORITIES)}
          value={filters.priority}
          onChange={(priority) => onChange({ priority })}
        />
        <FilterSelect
          label="Type"
          items={toItems(FEEDBACK_TYPE_OPTIONS)}
          value={filters.primaryFeedbackType}
          onChange={(primaryFeedbackType) => onChange({ primaryFeedbackType })}
        />
        {hasActiveInboxFilters(filters) ? (
          <Button
            variant="ghost"
            className="h-9 rounded-full font-semibold"
            onClick={onClear}
          >
            <X data-icon="inline-start" />
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  anyLabel = `${label}: Any`,
  items,
  value,
  onChange,
}: {
  label: string;
  anyLabel?: string;
  items: ReadonlyArray<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const anyValue = `${label.toLowerCase()}-any`;
  const allItems = [{ label: anyLabel, value: anyValue }, ...items];

  return (
    <Select
      items={allItems}
      value={value || anyValue}
      onValueChange={(nextValue) =>
        onChange(nextValue === anyValue ? "" : (nextValue ?? ""))
      }
    >
      <SelectTrigger className={TRIGGER_CLASS} aria-label={label}>
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
