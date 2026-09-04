"use client";

import { FACTORS, FACTOR_LABELS, type Subscores } from "@/lib/scoring/weights";

/**
 * Six factors on six axes.
 *
 * Hand-drawn rather than charted. Recharts is in the stack for the history
 * views, but this is six fixed spokes with no interaction and no animation, and
 * a hundred kilobytes of charting library to draw one hexagon would sit badly
 * beside a §5 rule that every operation be explainable in one sentence.
 *
 * A factor with no evidence is drawn as a gap in the ring rather than as a
 * point at zero, because a hole is honest and a zero is a lie.
 */
export default function FactorRadar({ subscores }: { subscores: Subscores }) {
  const size = 260;
  const centre = size / 2;
  const radius = size / 2 - 46;
  const rings = [25, 50, 75, 100];

  const point = (index: number, value: number) => {
    // Start at twelve o'clock and go clockwise.
    const angle = (Math.PI * 2 * index) / FACTORS.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return { x: centre + Math.cos(angle) * r, y: centre + Math.sin(angle) * r };
  };

  const axisEnd = (index: number) => point(index, 100);

  const scored = FACTORS.map((f, i) => ({ factor: f, index: i, value: subscores[f] }));
  const present = scored.filter((s) => s.value !== null);

  // Only close the shape when every factor has evidence; otherwise draw the
  // segments that exist and leave the rest open.
  const complete = present.length === FACTORS.length;
  const path = present
    .map((s, n) => {
      const p = point(s.index, s.value as number);
      return `${n === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[300px]"
      role="img"
      aria-label={
        "Six factor subscores. " +
        FACTORS.map(
          (f) =>
            `${FACTOR_LABELS[f]} ${subscores[f] === null ? "not scored" : Math.round(subscores[f] as number)}`
        ).join(", ")
      }
    >
      {rings.map((r) => (
        <polygon
          key={r}
          points={FACTORS.map((_, i) => {
            const p = point(i, r);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="1"
        />
      ))}

      {FACTORS.map((_, i) => {
        const e = axisEnd(i);
        return (
          <line
            key={i}
            x1={centre}
            y1={centre}
            x2={e.x}
            y2={e.y}
            stroke="var(--rule)"
            strokeWidth="1"
          />
        );
      })}

      {present.length >= 2 && (
        <path
          d={complete ? `${path} Z` : path}
          fill={complete ? "var(--accent)" : "none"}
          fillOpacity={complete ? 0.14 : 0}
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}

      {scored.map((s) => {
        if (s.value === null) return null;
        const p = point(s.index, s.value);
        return <circle key={s.factor} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />;
      })}

      {FACTORS.map((f, i) => {
        const e = axisEnd(i);
        // Push the label just outside the outer ring, away from the centre.
        const dx = e.x - centre;
        const dy = e.y - centre;
        const len = Math.hypot(dx, dy) || 1;
        const lx = centre + (dx / len) * (radius + 20);
        const ly = centre + (dy / len) * (radius + 20);
        const value = subscores[f];

        return (
          <text
            key={f}
            x={lx}
            y={ly}
            fontSize="9"
            textAnchor={Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end"}
            dominantBaseline="middle"
            fill={value === null ? "var(--muted)" : "var(--ink)"}
          >
            {FACTOR_LABELS[f].split(" ")[0]}
            <tspan fill="var(--muted)"> {value === null ? "n/s" : Math.round(value)}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
