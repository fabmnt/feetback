export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Picks the first supported language from a list ordered by preference, such
 * as `navigator.languages`. Regions are ignored ("es-MX" becomes "es").
 * Falls back to the default locale when nothing matches.
 */
export function resolveLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primaryTag = language.trim().toLowerCase().split("-")[0];
    const match = SUPPORTED_LOCALES.find((locale) => locale === primaryTag);

    if (match) {
      return match;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Turns an `Accept-Language` header such as "es-MX,es;q=0.9,en;q=0.8" into a
 * list of language tags ordered by preference.
 */
export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) {
    return [];
  }

  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number(qParam.trim().slice(2)) : 1;

      return { tag: tag.trim(), quality, index };
    })
    .filter(({ tag, quality }) => tag && tag !== "*" && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map(({ tag }) => tag);
}
