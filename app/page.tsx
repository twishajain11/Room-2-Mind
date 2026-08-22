import Link from "next/link";

const DOES_NOT_CLAIM = [
  "It does not claim clutter causes anxiety, or any causal claim about environment and mental health.",
  "It does not diagnose anything.",
  "It does not claim its priors are personalized until that user has logged enough sessions.",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-reading flex-col justify-center gap-12 px-6 py-20">
      <header className="space-y-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Room to Mind</p>
        <h1 className="text-balance text-3xl font-medium leading-snug">
          Your physical environment loads your attention every second you are in it. It is the one
          input to cognition that nobody measures.
        </h1>
        <p className="text-muted">
          Room to Mind measures that load across a visual and an acoustic channel, produces a
          transparent load index, and ranks the single highest impact change you could make.
        </p>
      </header>

      <div className="space-y-3">
        <Link
          href="/capture"
          className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Take a snapshot
        </Link>
        <p className="text-xs text-muted">
          The photo is read inside your browser and discarded. It is never uploaded.
        </p>
      </div>

      <section className="space-y-3 border-t border-rule pt-8">
        <h2 className="text-sm font-medium">What this does not claim</h2>
        <ul className="space-y-2 text-sm text-muted">
          {DOES_NOT_CLAIM.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="select-none text-rule">
                —
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
