/*
 * Theme picker shared across all example pages.
 *
 * - Reads/writes the chosen theme from localStorage so the choice
 *   persists across pages.
 * - Applies it to `<html data-theme>` for CSS.
 * - Exposes `getColorMode()` for SDK pages to seed `appearance.colorMode`
 *   and a `themechange` CustomEvent for them to react to runtime changes
 *   via `checkout.changeAppearance({ colorMode })`.
 */

const STORAGE_KEY = "xpay-example-theme";

/** Returns "light" | "dark" | "system". */
export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) ?? "system";
}

/** Returns the resolved color mode: "light" or "dark". Maps "system" via prefers-color-scheme. */
export function getColorMode() {
  const theme = getTheme();
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(theme) {
  const html = document.documentElement;
  // We always set `data-theme` to a concrete `light` | `dark` value so the
  // CSS only needs two cases. For "system", we resolve via prefers-color-scheme
  // here — and `mountThemePicker` below subscribes to OS-pref changes so
  // staying on "system" keeps the page in sync if the OS toggles dark mode.
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  html.setAttribute("data-theme", resolved);
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  // Fire a custom event so pages can resync their SDK appearance.
  window.dispatchEvent(
    new CustomEvent("themechange", { detail: { theme, colorMode: getColorMode() } }),
  );
}

/** Mounts the <select> theme picker and wires it up. */
export function mountThemePicker(selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.value = getTheme();
  applyTheme(el.value);

  el.addEventListener("change", () => setTheme(el.value));

  // If user is on "system" and they change OS preference, follow it.
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getTheme() === "system") setTheme("system");
    });
}
