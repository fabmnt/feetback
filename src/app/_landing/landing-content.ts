import type { FeedbackType } from "@/lib/feedback-types";

/** Feedback Types shown on the landing page, each with its own sticker color. */
export type LandingNoteType = Extract<
  FeedbackType,
  "bug_report" | "improvement_suggestion" | "question" | "performance_issue"
>;

export const NOTE_TYPE_STYLES: Record<LandingNoteType, string> = {
  bug_report: "bg-(--lp-pink) text-white",
  improvement_suggestion: "bg-(--lp-sun) text-(--lp-ink)",
  question: "bg-(--lp-sky) text-(--lp-ink)",
  performance_issue: "bg-(--lp-mint) text-(--lp-ink)",
};

export type LandingNote = {
  type: LandingNoteType;
  text: string;
  author: string;
  app: string;
};

/** Type, author, and app of each fake note. Texts come from the landing copy. */
export const NOTE_SLOTS: Omit<LandingNote, "text">[] = [
  { type: "bug_report", author: "Maya", app: "Acme Shop" },
  { type: "improvement_suggestion", author: "Leo", app: "Acme Shop" },
  { type: "question", author: "Ines", app: "Acme Shop" },
  { type: "performance_issue", author: "Tom", app: "Acme Shop" },
  { type: "bug_report", author: "Sam", app: "Pixel Notes" },
  { type: "improvement_suggestion", author: "Ana", app: "Shopwise" },
  { type: "question", author: "Kenji", app: "Pixel Notes" },
  { type: "performance_issue", author: "Zoe", app: "Shopwise" },
];

/** The first notes are typed into the fake Feedback Popover, one at a time. */
const POPOVER_NOTE_COUNT = 4;

/** Joins the note slots with their translated texts. */
export function buildLandingNotes(texts: readonly string[]) {
  const notes: LandingNote[] = NOTE_SLOTS.map((slot, index) => ({
    ...slot,
    text: texts[index] ?? "",
  }));

  return {
    /** Notes typed into the fake Feedback Popover. */
    popoverNotes: notes.slice(0, POPOVER_NOTE_COUNT),
    /** Notes scrolling through the fake dashboard inbox. */
    inboxNotes: notes,
  };
}

export const EMBED_SNIPPET = `<script>
  window.FeetbackSettings = {
    clientKey: "your-client-key"
  };
</script>
<script
  src="https://your-feetback-host/feetback.js"
  async
></script>`;
