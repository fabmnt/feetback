import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relative-time";

const NOW = Date.parse("2026-11-13T12:00:00.000Z");

function ago(seconds: number) {
  return new Date(NOW - seconds * 1000).toISOString();
}

describe("formatRelativeTime", () => {
  it("says just now for the last minute", () => {
    expect(formatRelativeTime(ago(20), NOW)).toBe("just now");
  });

  it("picks the largest unit that fits", () => {
    expect(formatRelativeTime(ago(5 * 60), NOW)).toBe("5 min. ago");
    expect(formatRelativeTime(ago(3 * 60 * 60), NOW)).toBe("3 hr. ago");
    expect(formatRelativeTime(ago(24 * 60 * 60), NOW)).toBe("yesterday");
    expect(formatRelativeTime(ago(14 * 24 * 60 * 60), NOW)).toBe("2 wk. ago");
  });

  it("never rounds up into a count that belongs to the next unit", () => {
    expect(formatRelativeTime(ago(59.5 * 60), NOW)).toBe("59 min. ago");
    expect(formatRelativeTime(ago(23.5 * 60 * 60), NOW)).toBe("23 hr. ago");
  });

  it("returns empty text for invalid dates", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe("");
  });
});
