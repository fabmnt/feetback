"use client";

import { Inbox, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { FootprintIcon } from "@/components/footprint-icon";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const SETTINGS_HREF = "/dashboard/settings";

const NAV_LINKS = [
  { label: "Inbox", shortLabel: "Inbox", href: "/dashboard", icon: Inbox },
  {
    label: "Customer Apps",
    shortLabel: "Apps",
    href: SETTINGS_HREF,
    icon: Settings2,
  },
] as const;

/** Issue detail pages live under /dashboard, so everything but settings is the Inbox. */
function isLinkActive(href: string, pathname: string) {
  const inSettings = pathname.startsWith(SETTINGS_HREF);
  return href === SETTINGS_HREF ? inSettings : !inSettings;
}

export function DashboardHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-line border-b bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2 font-extrabold text-lg"
        >
          <span className="grid size-9 place-items-center rounded-full bg-sun text-night transition-transform group-hover:-rotate-12">
            <FootprintIcon className="size-5 rotate-12" />
          </span>
          <span className="hidden sm:inline">Feetback</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-full bg-card p-1 ring-1 ring-line">
            {NAV_LINKS.map(({ label, shortLabel, href, icon: Icon }) => {
              const active = isLinkActive(href, pathname);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-semibold text-sm transition-colors",
                    active
                      ? "bg-ink text-paper"
                      : "text-ink-soft hover:bg-lilac hover:text-ink",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
