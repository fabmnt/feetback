import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearTheme,
  isDarkThemeShown,
  resolveTheme,
  saveTheme,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "./theme";

function mockSystemPrefersDark(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  );
}

/** This Node and jsdom combination exposes no working localStorage. */
function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("theme", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    clearTheme();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("follows the system preference when nothing is saved", () => {
    mockSystemPrefersDark(true);
    expect(resolveTheme()).toBe("dark");

    mockSystemPrefersDark(false);
    expect(resolveTheme()).toBe("light");
  });

  it("prefers the saved choice over the system preference", () => {
    mockSystemPrefersDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    expect(resolveTheme()).toBe("light");
  });

  it("ignores invalid saved values", () => {
    mockSystemPrefersDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");

    expect(resolveTheme()).toBe("dark");
  });

  it("falls back to light when matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);

    expect(resolveTheme()).toBe("light");
  });

  it("saves and shows the chosen theme", () => {
    saveTheme("dark");

    expect(isDarkThemeShown()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    saveTheme("light");
    expect(isDarkThemeShown()).toBe(false);
  });

  it("still shows the theme when storage throws", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => saveTheme("dark")).not.toThrow();
    expect(isDarkThemeShown()).toBe(true);
  });

  it("applies the saved theme from the inline script on Dashboard pages", () => {
    mockSystemPrefersDark(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.history.pushState({}, "", "/dashboard/settings");

    new Function(THEME_INIT_SCRIPT)();

    expect(isDarkThemeShown()).toBe(true);
  });

  it("keeps pages outside the Dashboard light from the inline script", () => {
    mockSystemPrefersDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.history.pushState({}, "", "/");

    new Function(THEME_INIT_SCRIPT)();

    expect(isDarkThemeShown()).toBe(false);
  });
});
