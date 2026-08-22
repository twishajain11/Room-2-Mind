"use client";

import { VISION_METHODS, type MethodEntry } from "@/lib/vision/methods";
import type { VisionFeatures } from "@/lib/vision/types";

const SECTIONS: MethodEntry["section"][] = ["Light", "Complexity", "Colour", "Objects", "Layout"];

/** Render a feature value the way a reader can check it, never rounded away to nothing. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "not detected";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(Math.abs(value) < 1 ? 4 : 2);
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, number>)
      .map(([k, v]) => k + " " + v.toFixed(3))
      .join(", ");
  }
  return String(value);
}

export default function FeatureTable({ features }: { features: VisionFeatures }) {
  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => {
        const rows = VISION_METHODS.filter((m) => m.section === section);
        return (
          <section key={section} className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.18em] text-muted">{section}</h3>
            <dl className="divide-y divide-rule border-y border-rule">
              {rows.map((m) => (
                <div key={m.key} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-6">
                  <div className="space-y-1">
                    <dt className="text-sm font-medium">{m.label}</dt>
                    <p className="text-xs leading-relaxed text-muted">{m.method}</p>
                  </div>
                  <dd className="numeric self-start text-sm sm:text-right">
                    {formatValue((features as unknown as Record<string, unknown>)[m.key])}
                    <span className="block text-[11px] text-muted">{m.range}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
