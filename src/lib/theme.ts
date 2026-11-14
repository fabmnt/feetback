export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "feetback-theme";

const DARK_CLASS = "dark";

/** Only the Dashboard has a dark design; other pages always stay light. */
const DASHBOARD_PATH = "/dashboard";

/** Storage can throw in private windows or when site data is blocked. */
function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

/** The User's saved choice, or the system preference when nothing is saved. */
export function resolveTheme(): Theme {
  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  return readStoredTheme() ?? (prefersDark ? "dark" : "light");
}

/** Shows the theme without saving it, e.g. when entering the Dashboard. */
export function showTheme(theme: Theme) {
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
}

/** Shows the theme and remembers it as the User's choice. */
export function saveTheme(theme: Theme) {
  showTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The theme still applies for this page view.
  }
}

/** Removes the dark class so pages outside the Dashboard stay light. */
export function clearTheme() {
  document.documentElement.classList.remove(DARK_CLASS);
}

export function isDarkThemeShown() {
  return document.documentElement.classList.contains(DARK_CLASS);
}

/**
 * Runs before the first paint so a dark Dashboard doesn't flash light.
 * Mirrors resolveTheme() and showTheme(); it must stay plain inline JS.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(location.pathname.indexOf(${JSON.stringify(DASHBOARD_PATH)})!==0)return;var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("${DARK_CLASS}",t==="dark")}catch(e){}})()`;
