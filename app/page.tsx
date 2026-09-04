import Link from "next/link";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { FACTORS, FACTOR_LABELS, FACTOR_MEANING, STANDARD_WEIGHTS } from "@/lib/scoring/weights";

const DOES_NOT_CLAIM = [
  "It does not claim clutter causes anxiety, or any causal claim about environment and mental health.",
  "It does not diagnose anything.",
  "It does not claim its priors are personalized until that user has logged enough sessions.",
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-14 lg:py-20">
      <WelcomeOverlay />
      {/* Hero and the two channels sit side by side once there is room for them,
          rather than leaving half a laptop screen empty. */}
      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-16">
      <section className="space-y-7">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Room to Mind</p>
        <h1 className="display text-balance text-4xl leading-[1.15] sm:text-5xl">
          Your environment loads your attention every second you are in it.
        </h1>
        <p className="max-w-reading text-lg leading-relaxed text-ink-soft">
          It is the one input to cognition that nobody measures. Room to Mind measures it across
          two sensing channels, shows you the whole arithmetic, and ranks the single change worth
          making first.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/capture"
            className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Measure a room
          </Link>
          <Link
            href="/practice"
            className="rounded-md border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink"
          >
            Take a few minutes
          </Link>
        </div>

        <p className="text-xs text-muted">
          The photograph is read inside your browser and discarded. It is never uploaded.
        </p>
      </section>

      {/* The two channels, stated once, quietly. */}
      <section className="space-y-6 lg:pt-2">
        <h2 className="text-xs uppercase tracking-[0.18em] text-muted">How it reads a room</h2>
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-2 bg-card p-6">
            <p className="display text-lg">The visual channel</p>
            <p className="text-sm leading-relaxed text-muted">
              One photograph, reduced to 512 pixels, read for brightness, contrast, edge density,
              colour spread, and the objects it can name. Then discarded.
            </p>
          </div>
          <div className="space-y-2 bg-card p-6">
            <p className="display text-lg">The acoustic channel</p>
            <p className="text-sm leading-relaxed text-muted">
              Twenty seconds of listening, reduced to five numbers as it goes. It reports what the
              sound was made of, never how many decibels it reached.
            </p>
          </div>
        </div>
      </section>

      </div>

      {/* The six factors, with their weights visible from the front page. */}
      <section className="mt-20 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted">
            The six factors, and what each is worth
          </h2>
          <p className="max-w-reading text-xs text-muted">
            These weights are priors, not truths, and every one of them is adjustable in the app.
          </p>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {FACTORS.map((factor) => (
            <li key={factor} className="flex items-baseline gap-4 py-3">
              <span className="numeric w-10 shrink-0 text-sm text-muted">
                {STANDARD_WEIGHTS[factor].toFixed(2)}
              </span>
              <span className="w-44 shrink-0 text-sm font-medium">{FACTOR_LABELS[factor]}</span>
              <span className="hidden text-xs leading-relaxed text-muted sm:block">
                {FACTOR_MEANING[factor]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 space-y-4 rounded-md border border-rule bg-card p-6 lg:p-8">
        <h2 className="display text-xl">What this does not claim</h2>
        <ul className="space-y-3">
          {DOES_NOT_CLAIM.map((line) => (
            <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
              <span aria-hidden className="select-none text-rule">
                —
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-6 text-xs text-muted">
        <Link href="/calibrate" className="hover:text-ink">
          Help calibrate it
        </Link>
        <Link href="/practice" className="hover:text-ink">
          Practice room
        </Link>
        <span>No account, no email, no image ever stored.</span>
      </footer>
    </main>
  );
}
