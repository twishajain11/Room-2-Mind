"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

/**
 * The chrome every page shares.
 *
 * The dim control lives here rather than inside one page because light
 * sensitivity does not politely confine itself to the screen where the toggle
 * used to be. Somebody who needs the page dimmed needs it dimmed on the page
 * they are looking at now.
 */
const NAV = [
  { href: "/capture", label: "Measure" },
  { href: "/practice", label: "Antara" },
  { href: "/calibrate", label: "Calibrate" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("default");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "recovery" ? "default" : "recovery";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <header className="border-b border-rule">
      {/* On a phone the wordmark and the dim control share the first row and the
          nav takes the second, rather than stacking into three and eating the
          top of every screen. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3">
        <Link
          href="/"
          className="order-1 text-xs uppercase tracking-[0.22em] text-muted transition-colors hover:text-ink"
        >
          Room to Mind
        </Link>

        <nav className="order-3 flex w-full items-center gap-6 text-sm sm:order-2 sm:w-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "transition-colors " + (active ? "text-ink" : "text-muted hover:text-ink")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggle}
          aria-pressed={theme === "recovery"}
          title="Dims the whole interface to a warm, low-blue palette. Gentler on light sensitivity; changes only how the page looks, not the score."
          className={
            "order-2 ml-auto rounded-full border px-4 py-1.5 text-xs transition-colors sm:order-3 " +
            (theme === "recovery"
              ? "border-accent bg-accent text-accent-ink"
              : "border-rule hover:border-ink")
          }
        >
          {theme === "recovery" ? "Comfort Palette: on" : "Comfort Palette"}
        </button>
      </div>
    </header>
  );
}
