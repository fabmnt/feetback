import type { FeedbackType } from "@/lib/feedback-types";

/** Feedback Types shown on the landing page, each with its own sticker color. */
export type LandingNoteType = Extract<
  FeedbackType,
  "bug_report" | "improvement_suggestion" | "question" | "performance_issue"
>;

export const NOTE_TYPE_STYLES: Record<
  LandingNoteType,
  { label: string; className: string }
> = {
  bug_report: { label: "Bug", className: "bg-(--lp-pink) text-white" },
  improvement_suggestion: {
    label: "Idea",
    className: "bg-(--lp-sun) text-(--lp-ink)",
  },
  question: { label: "Question", className: "bg-(--lp-sky) text-(--lp-ink)" },
  performance_issue: {
    label: "Speed",
    className: "bg-(--lp-mint) text-(--lp-ink)",
  },
};

export type LandingNote = {
  type: LandingNoteType;
  text: string;
  author: string;
  app: string;
};

/** Notes typed into the fake Feedback Popover, one at a time. */
export const POPOVER_NOTES: LandingNote[] = [
  {
    type: "bug_report",
    text: "Pay button does nothing on Safari",
    author: "Maya",
    app: "Acme Shop",
  },
  {
    type: "improvement_suggestion",
    text: "A dark mode would be lovely",
    author: "Leo",
    app: "Acme Shop",
  },
  {
    type: "question",
    text: "Where do I change my email?",
    author: "Ines",
    app: "Acme Shop",
  },
  {
    type: "performance_issue",
    text: "Search feels slow with big lists",
    author: "Tom",
    app: "Acme Shop",
  },
];

/** Notes scrolling through the fake dashboard inbox. */
export const INBOX_NOTES: LandingNote[] = [
  ...POPOVER_NOTES,
  {
    type: "bug_report",
    text: "Avatar upload spins forever",
    author: "Sam",
    app: "Pixel Notes",
  },
  {
    type: "improvement_suggestion",
    text: "Let me pin my favorite reports",
    author: "Ana",
    app: "Shopwise",
  },
  {
    type: "question",
    text: "Can I invite my whole team?",
    author: "Kenji",
    app: "Pixel Notes",
  },
  {
    type: "performance_issue",
    text: "Charts take 5s to show up",
    author: "Zoe",
    app: "Shopwise",
  },
];

/** Different words from different Reporters that describe one Feedback Issue. */
export const SAME_ISSUE_NOTES = [
  "Checkout button is dead",
  "I click Pay and nothing happens",
  "Can't finish my order on iPhone",
  "Payment stuck, please help",
];

export const SETUP_STEPS = [
  {
    title: "Add your app",
    text: "Give it a name in the dashboard and get your key.",
  },
  {
    title: "Paste one script tag",
    text: "A small button shows up. Your app keeps working as before.",
  },
  {
    title: "Read and fix",
    text: "Notes arrive with a screenshot, page details, and a type.",
  },
];

export const EMBED_SNIPPET = `<script>
  window.FeetbackSettings = {
    clientKey: "your-client-key"
  };
</script>
<script
  src="https://your-feetback-host/feetback.js"
  async
></script>`;
