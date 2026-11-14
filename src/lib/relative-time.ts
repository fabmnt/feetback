const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const JUST_NOW_SECONDS = 60;

const formatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "short",
});

/** Formats an ISO date as short relative text like "5 min. ago" or "yesterday". */
export function formatRelativeTime(isoDate: string, now = Date.now()) {
  const elapsedSeconds = Math.round((now - Date.parse(isoDate)) / 1000);

  if (Number.isNaN(elapsedSeconds)) {
    return "";
  }

  if (Math.abs(elapsedSeconds) < JUST_NOW_SECONDS) {
    return "just now";
  }

  const [unit, unitSeconds] =
    UNITS.find(([, seconds]) => Math.abs(elapsedSeconds) >= seconds) ??
    UNITS[UNITS.length - 1];

  // Truncate so 59.5 minutes reads "59 min." instead of "60 min.".
  return formatter.format(-Math.trunc(elapsedSeconds / unitSeconds), unit);
}
