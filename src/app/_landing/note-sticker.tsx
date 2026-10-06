import { cn } from "@/lib/utils";

import { type LandingNoteType, NOTE_TYPE_STYLES } from "./landing-content";

export function NoteSticker({
  type,
  label,
  className,
}: {
  type: LandingNoteType;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-bold text-xs",
        NOTE_TYPE_STYLES[type],
        className,
      )}
    >
      {label}
    </span>
  );
}
