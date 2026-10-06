import { headers } from "next/headers";

import {
  isLocale,
  type Locale,
  parseAcceptLanguage,
  resolveLocale,
} from "./locale";

/**
 * Locale of the current request. A supported `?lang=` query value wins, so
 * both languages can be tested; otherwise it comes from the browser's
 * `Accept-Language` header. Reading request headers makes the calling page
 * render per request instead of being prerendered.
 */
export async function getRequestLocale(
  langParam?: string | string[],
): Promise<Locale> {
  if (isLocale(langParam)) {
    return langParam;
  }

  const requestHeaders = await headers();

  return resolveLocale(
    parseAcceptLanguage(requestHeaders.get("accept-language")),
  );
}
