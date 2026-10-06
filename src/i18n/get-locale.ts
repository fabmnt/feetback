import { headers } from "next/headers";

import { type Locale, parseAcceptLanguage, resolveLocale } from "./locale";

/**
 * Locale of the current request, taken from the browser's `Accept-Language`
 * header. Reading request headers makes the calling page render per request
 * instead of being prerendered.
 */
export async function getRequestLocale(): Promise<Locale> {
  const requestHeaders = await headers();

  return resolveLocale(
    parseAcceptLanguage(requestHeaders.get("accept-language")),
  );
}
