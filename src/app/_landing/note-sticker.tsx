import { cn } from "@/lib/utils";

import { type LandingNoteType, NOTE_TYPE_STYLES } from "./landing-content";

export function NoteSticker({
  type,
  className,
}: {
  type: LandingNoteType;
  className?: string;
}) {
  const style = NOTE_TYPE_STYLES[type];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-bold text-xs",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
