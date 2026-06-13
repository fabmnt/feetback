import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges truthy class names", () => {
    expect(cn("px-2", false && "hidden", "py-4")).toBe("px-2 py-4");
  });

  it("resolves conflicting Tailwind utilities", () => {
    expect(cn("px-2", "px-4", "text-sm", "text-lg")).toBe("px-4 text-lg");
  });
});
