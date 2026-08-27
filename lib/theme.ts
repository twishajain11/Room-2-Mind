/**
 * Palette switching.
 *
 * The theme lives on the root element as `data-theme`, so every token swaps at
 * once and no component needs to know which palette it is in. Recovery Mode
 * scoring and the recovery palette are deliberately the same switch: a tool
 * that reweights toward light sensitivity should not keep shining a white page
 * at the person who turned it on.
 */

export type Theme = "default" | "recovery";

const KEY = "rtm:theme";

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (theme === "recovery") {
    document.documentElement.setAttribute("data-theme", "recovery");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // A remembered preference is a convenience, not a requirement.
  }
}

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "recovery" ? "recovery" : "default";
  } catch {
    return "default";
  }
}

/** True when the viewer has asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
