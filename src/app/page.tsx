import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { FootprintIcon } from "@/app/_landing/footprint-icon";
import { HeroScene } from "@/app/_landing/hero-scene";
import styles from "@/app/_landing/landing.module.css";
import { EMBED_SNIPPET } from "@/app/_landing/landing-content";
import { LANDING_COPY, type LandingCopy } from "@/app/_landing/landing-copy";
import { NoteSticker } from "@/app/_landing/note-sticker";
import { FeetbackEmbed } from "@/app/feetback-embed";
import { getRequestLocale } from "@/i18n/get-locale";
import { cn } from "@/lib/utils";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
});

const CONTACT_EMAIL = "fabianmontoya2802@gmail.com";

type HomeProps = { searchParams: Promise<{ lang?: string | string[] }> };

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const locale = await getRequestLocale((await searchParams).lang);

  return { description: LANDING_COPY[locale].metadataDescription };
}

const primaryLinkClass =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border-2 border-(--lp-grape) bg-(--lp-grape) px-6 font-bold text-white transition-colors hover:bg-(--lp-grape-deep)";
const secondaryLinkClass =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border-2 border-(--lp-ink) px-6 font-bold transition-colors hover:bg-(--lp-ink) hover:text-white";

/**
 * The language comes from the browser's Accept-Language header, so this page
 * renders per request instead of being prerendered.
 */
export default async function Home({ searchParams }: HomeProps) {
  const locale = await getRequestLocale((await searchParams).lang);
  const copy = LANDING_COPY[locale];
  const requestAccessHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(copy.requestAccessSubject)}`;

  return (
    <div
      lang={locale}
      className={cn(styles.page, bricolage.variable, "min-h-svh")}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-xl"
        >
          <span className="grid size-9 place-items-center rounded-full bg-(--lp-sun)">
            <FootprintIcon className="size-5 rotate-12" />
          </span>
          Feetback
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          <Link
            href="/demo/customer-app"
            className="hidden font-semibold hover:underline sm:inline"
          >
            {copy.tryTheDemo}
          </Link>
          <a
            href={requestAccessHref}
            className="inline-flex h-10 items-center rounded-full bg-(--lp-ink) px-4 font-bold text-sm text-white transition-colors hover:bg-(--lp-grape)"
          >
            {copy.requestAccess}
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-8 sm:pt-16">
          <h1
            className={cn(
              styles.headline,
              "max-w-5xl text-[clamp(3.25rem,10vw,8rem)]",
            )}
          >
            {copy.heroTitle}
          </h1>
          <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-(--lp-ink-soft) text-lg leading-relaxed">
              {copy.heroText}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href={requestAccessHref} className={primaryLinkClass}>
                {copy.startCollecting}
              </a>
              <Link href="/demo/customer-app" className={secondaryLinkClass}>
                {copy.tryTheDemoApp}
              </Link>
            </div>
          </div>
          <div className="mt-12">
            <HeroScene copy={copy} />
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className={cn(styles.headline, "text-5xl sm:text-6xl")}>
              {copy.voicesTitle}
            </h2>
            <p className="mt-5 max-w-md text-(--lp-ink-soft) text-lg leading-relaxed">
              {copy.voicesText}
            </p>
          </div>
          <SameIssueVisual copy={copy} />
        </section>

        <div className="border-(--lp-line) border-y bg-white">
          <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
            <h2 className={cn(styles.headline, "text-5xl sm:text-6xl")}>
              {copy.setupTitle}
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.1fr]">
              <ol className="grid gap-6">
                {copy.setupSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--lp-sun) font-extrabold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-lg">{step.title}</p>
                      <p className="text-(--lp-ink-soft)">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <pre className="self-start whitespace-pre-wrap rounded-2xl [overflow-wrap:anywhere] bg-(--lp-ink) p-5 font-mono text-sm text-white leading-relaxed">
                <code>{EMBED_SNIPPET}</code>
              </pre>
            </div>
          </section>
        </div>

        <section className="bg-(--lp-ink) pt-20 pb-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
            <div className="flex flex-col items-start gap-8 rounded-[2rem] bg-(--lp-grape) px-6 py-12 text-white shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] sm:px-12 md:flex-row md:items-center md:justify-between">
              <h2
                className={cn(styles.headline, "max-w-xl text-5xl sm:text-6xl")}
              >
                {copy.ctaTitle}
              </h2>
              <a
                href={requestAccessHref}
                className="inline-flex h-14 shrink-0 items-center rounded-full bg-(--lp-sun) px-8 font-extrabold text-(--lp-ink) text-lg transition-transform hover:-rotate-2"
              >
                {copy.requestAccess}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-(--lp-ink) pb-24 text-sm text-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 sm:px-8">
          <span className="flex items-center gap-2">
            <FootprintIcon className="size-4 rotate-12" />
            Feetback
          </span>
          <p>
            {copy.madeWithLoveBy}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold underline hover:text-(--lp-sun)"
            >
              Fabián
            </a>
          </p>
        </div>
      </footer>

      <FeetbackEmbed
        settings={{
          // The landing page collects feedback with the demo Customer App key.
          clientKey: "demo_customer_app",
          apiUrl: "/api/feedback",
          language: locale,
          theme: { fontFamily: bricolage.style.fontFamily },
        }}
      />
    </div>
  );
}

const NOTE_TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

function SameIssueVisual({ copy }: { copy: LandingCopy }) {
  return (
    <div aria-hidden="true" className="grid gap-5">
      <div className="grid grid-cols-2 gap-3">
        {copy.sameIssueNotes.map((text, index) => (
          <p
            key={text}
            className={cn(
              "rounded-2xl rounded-bl-sm bg-white p-3 text-sm shadow-[0_10px_30px_-18px_rgb(31_17_71/0.6)]",
              NOTE_TILTS[index],
            )}
          >
            {text}
          </p>
        ))}
      </div>
      <div className="rounded-2xl border-(--lp-pink) border-2 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <NoteSticker
            type="bug_report"
            label={copy.noteTypeLabels.bug_report}
          />
          <span className="text-(--lp-ink-soft) text-sm">
            {copy.issueSummary}
          </span>
        </div>
        <p className="mt-3 font-bold text-xl">{copy.issueTitle}</p>
        <span className="mt-4 inline-flex rounded-full bg-(--lp-paper) px-3 py-1.5 font-semibold text-sm">
          {copy.copyPrompt}
        </span>
      </div>
    </div>
  );
}
