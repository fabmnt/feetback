"use client";

import { useEffect } from "react";

export function DashboardTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains("dark");

    root.classList.add("dark");

    return () => {
      if (!hadDarkClass) {
        root.classList.remove("dark");
      }
    };
  }, []);

  return children;
}
