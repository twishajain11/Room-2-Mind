"use client";

/**
 * The score, drawn.
 *
 * An arc rather than a bar, because the number is a position on a range and not
 * a quantity of anything. The track shows the whole 0 to 100 so a low score
 * reads as low rather than as a small unexplained sliver, and the number itself
 * stays the loudest thing in the frame: the drawing supports it, never replaces
 * it.
 */
export default function ScoreDial({
  value,
  label,
  skipped,
}: {
  value: number;
  label: string;
  skipped: number;
}) {
  const size = 168;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  // Three quarters of a circle, opening downward.
  const sweep = 270;
  const start = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * arcLength;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Environmental Load Index ${value.toFixed(0)} out of 100, ${label}`}
        >
          <g transform={`rotate(${start} ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--rule)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
            />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="numeric text-5xl font-light leading-none">{value.toFixed(0)}</span>
          <span className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted">of 100</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="display text-2xl">{label}</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted">
          Environmental Load Index. Higher means more load, which is worse.
        </p>
        {skipped > 0 && (
          <p className="max-w-xs text-xs leading-relaxed text-muted">
            {skipped} factor{skipped === 1 ? "" : "s"} had no evidence in this snapshot and{" "}
            {skipped === 1 ? "was" : "were"} left out of the arithmetic entirely.
          </p>
        )}
      </div>
    </div>
  );
}
