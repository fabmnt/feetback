import type { CSSProperties } from "react";

/** A single bare footprint, used for the logo and the walking trail. */
export function FootprintIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 32"
      aria-hidden="true"
      className={className}
      style={style}
      fill="currentColor"
    >
      <ellipse cx="12" cy="21" rx="7" ry="10" />
      <circle cx="4.5" cy="6.5" r="2.6" />
      <circle cx="9.5" cy="3.6" r="2.4" />
      <circle cx="14.5" cy="3.4" r="2.2" />
      <circle cx="18.6" cy="5.4" r="1.9" />
      <circle cx="21.2" cy="9" r="1.6" />
    </svg>
  );
}
