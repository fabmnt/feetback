"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

import {
  clearTheme,
  isDarkThemeShown,
  resolveTheme,
  saveTheme,
  showTheme,
} from "@/lib/theme";

/** Re-renders when the dark class on <html> changes. */
function subscribeToThemeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/**
 * Applies the Dashboard theme while mounted. The landing page has no dark
 * design, so leaving the Dashboard removes the dark class again.
 * A layout effect runs before paint, so client navigations don't flash the
 * wrong theme.
 */
export function DashboardThemeSync() {
  useLayoutEffect(() => {
    showTheme(resolveTheme());
    return clearTheme;
  }, []);

  return null;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToThemeClass,
    isDarkThemeShown,
    () => false,
  );
  const nextTheme = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => saveTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-ink-soft ring-1 ring-line transition-colors hover:text-ink"
    >
      <Icon className="size-4 transition-transform hover:rotate-12" />
    </button>
  );
}
