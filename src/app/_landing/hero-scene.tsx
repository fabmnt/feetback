import type { CSSProperties } from "react";

import { FootprintIcon } from "./footprint-icon";
import styles from "./landing.module.css";
import { buildLandingNotes, type LandingNote } from "./landing-content";
import type { LandingCopy } from "./landing-copy";
import { NoteSticker } from "./note-sticker";

const FOOTSTEP_COUNT = 4;

/** Index passed to CSS so each animated item can stagger its own delay. */
function staggerStyle(index: number) {
  return { "--i": index } as CSSProperties;
}

/**
 * Decorative live scene: a Customer App sends notes that walk into the
 * dashboard inbox. Pure CSS animation, no client JavaScript.
 */
export function HeroScene({ copy }: { copy: LandingCopy }) {
  const { popoverNotes, inboxNotes } = buildLandingNotes(copy.noteTexts);

  return (
    <div
      aria-hidden="true"
      className="relative grid gap-6 rounded-[2rem] bg-(--lp-grape) p-4 sm:p-8 lg:grid-cols-[1.25fr_10rem_1fr] lg:items-center lg:gap-4"
    >
      <CustomerAppWindow copy={copy} notes={popoverNotes} />
      <FootstepTrail />
      <Inbox copy={copy} notes={inboxNotes} />
    </div>
  );
}

function CustomerAppWindow({
  copy,
  notes,
}: {
  copy: LandingCopy;
  notes: LandingNote[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgb(31_17_71/0.55)]">
      <div className="flex items-center gap-1.5 border-(--lp-ink)/10 border-b px-4 py-3">
        <span className="size-2.5 rounded-full bg-(--lp-pink)" />
        <span className="size-2.5 rounded-full bg-(--lp-sun)" />
        <span className="size-2.5 rounded-full bg-(--lp-mint)" />
        <span className="ml-3 rounded-full bg-(--lp-paper) px-3 py-0.5 text-(--lp-ink-soft) text-xs">
          acme.shop/checkout
        </span>
      </div>

      <div className="grid gap-4 p-5 pb-28 sm:p-6 sm:pb-32">
        <div className="h-4 w-2/5 rounded-full bg-(--lp-ink)/15" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 rounded-xl bg-(--lp-paper)" />
          <div className="h-16 rounded-xl bg-(--lp-paper)" />
          <div className="h-16 rounded-xl bg-(--lp-paper)" />
        </div>
        <div className="h-3 w-4/5 rounded-full bg-(--lp-ink)/10" />
        <div className="h-3 w-3/5 rounded-full bg-(--lp-ink)/10" />
        <div className="h-9 w-32 rounded-lg bg-(--lp-ink)/80" />
      </div>

      <FeedbackPopover copy={copy} notes={notes} />

      <span
        className={`${styles.feedbackButton} absolute right-4 bottom-4 grid size-12 place-items-center rounded-full bg-(--lp-sun) text-(--lp-ink) shadow-lg`}
      >
        <FootprintIcon className="size-6 rotate-12" />
      </span>
    </div>
  );
}

function FeedbackPopover({
  copy,
  notes,
}: {
  copy: LandingCopy;
  notes: LandingNote[];
}) {
  return (
    <div className="absolute right-4 bottom-20 w-[min(17rem,calc(100%-2rem))] rounded-2xl border border-(--lp-ink)/10 bg-white p-3 shadow-[0_18px_40px_-16px_rgb(31_17_71/0.45)]">
      <p className="font-bold text-sm">{copy.popoverTitle}</p>
      <div className="relative mt-2 h-16 rounded-xl bg-(--lp-paper)">
        {notes.map((note, index) => (
          <div
            key={note.text}
            className={`${styles.popoverNote} flex flex-col justify-between p-2.5`}
            style={staggerStyle(index)}
          >
            <span
              className={`${styles.typed} whitespace-nowrap text-sm`}
              style={staggerStyle(index)}
            >
              {note.text}
            </span>
            <NoteSticker
              type={note.type}
              label={copy.noteTypeLabels[note.type]}
              className={`${styles.typedSticker} self-start`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <span
          className={`${styles.sendButton} rounded-lg bg-(--lp-grape) px-3 py-1 font-bold text-white text-xs`}
        >
          {copy.send}
        </span>
      </div>
    </div>
  );
}

function FootstepTrail() {
  return (
    <div className="hidden items-center justify-between text-(--lp-sun) lg:flex">
      {Array.from({ length: FOOTSTEP_COUNT }, (_, index) => (
        <FootprintIcon
          // biome-ignore lint/suspicious/noArrayIndexKey: Static decorative list.
          key={index}
          className={`${styles.footstep} size-9 rotate-90 ${index % 2 === 0 ? "-translate-y-3" : "translate-y-3 -scale-x-100"}`}
          style={staggerStyle(index)}
        />
      ))}
    </div>
  );
}

function Inbox({ copy, notes }: { copy: LandingCopy; notes: LandingNote[] }) {
  return (
    <div className="rounded-2xl bg-(--lp-ink) p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">{copy.inboxTitle}</p>
        <p className="flex items-center gap-2 text-sm text-white/75">
          <span
            className={`${styles.liveDot} size-2 rounded-full bg-(--lp-mint)`}
          />
          <span className={styles.counter} /> {copy.inboxCounterSuffix}
        </p>
      </div>
      <div className="relative mt-4 h-72 overflow-hidden [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)]">
        <ul className={`${styles.feedTrack} grid`}>
          {[...notes, ...notes].map((note, index) => (
            <InboxRow
              // biome-ignore lint/suspicious/noArrayIndexKey: The list repeats on purpose for a seamless loop.
              key={index}
              note={note}
              typeLabel={copy.noteTypeLabels[note.type]}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function InboxRow({
  note,
  typeLabel,
}: {
  note: LandingNote;
  typeLabel: string;
}) {
  return (
    <li className="mb-2 rounded-xl bg-white/8 p-3">
      <div className="flex items-center justify-between gap-2">
        <NoteSticker type={note.type} label={typeLabel} />
        <span className="truncate text-white/60 text-xs">{note.app}</span>
      </div>
      <p className="mt-2 text-sm leading-snug">{note.text}</p>
      <p className="mt-1 text-white/55 text-xs">{note.author}</p>
    </li>
  );
}
