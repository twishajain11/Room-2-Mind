"use client";

import { useMemo } from "react";
import { BUCKETS, DETECTION_CONFIDENCE_THRESHOLD, isClutter } from "@/lib/vision/objects";
import type { Detection, NormalizedBox, Point } from "@/lib/vision/types";

/**
 * The room, redrawn from the numbers that survived.
 *
 * This is the privacy architecture made visible. Every mark here comes from the
 * stored feature vector and nothing else: the boxes are detection bounds, the
 * glow is `brightRegionCentroid` sized by `brightRegionRatio`, the line is
 * `screenLightAlignment`. There is no photograph behind it, because there is no
 * photograph anywhere. What you are looking at is the entire visual memory this
 * product has of your room.
 */

type Bucket = "work" | "screen" | "rest" | "clutter";

function bucketOf(cls: string): Bucket {
  if ((BUCKETS.screen as readonly string[]).includes(cls)) return "screen";
  if ((BUCKETS.workSurface as readonly string[]).includes(cls)) return "work";
  if ((BUCKETS.restSurface as readonly string[]).includes(cls)) return "rest";
  return isClutter(cls) ? "clutter" : "work";
}

const BUCKET_LABEL: Record<Bucket, string> = {
  screen: "Screen",
  work: "Work surface",
  rest: "Rest surface",
  clutter: "Loose object",
};

export default function RoomDiagram({
  detections,
  frame,
  brightCentroid,
  brightRatio,
  screenBox,
  screenLightAlignment,
}: {
  detections: Detection[];
  frame: { width: number; height: number };
  brightCentroid: Point;
  brightRatio: number;
  screenBox: NormalizedBox | null;
  screenLightAlignment: number | null;
}) {
  const W = 100;
  const H = Math.round((frame.height / frame.width) * 100) || 75;

  const boxes = useMemo(
    () =>
      detections
        .filter((d) => d.score >= DETECTION_CONFIDENCE_THRESHOLD)
        .map((d) => ({
          cls: d.class,
          score: d.score,
          bucket: bucketOf(d.class),
          x: (d.bbox[0] / frame.width) * W,
          y: (d.bbox[1] / frame.height) * H,
          w: (d.bbox[2] / frame.width) * W,
          h: (d.bbox[3] / frame.height) * H,
        }))
        // Largest first so small objects draw on top and stay clickable to the eye.
        .sort((a, b) => b.w * b.h - a.w * a.h),
    [detections, frame, H]
  );

  const light = { x: brightCentroid.x * W, y: brightCentroid.y * H };
  // A visible but bounded glow: even a tiny bright patch should be findable.
  const glowRadius = Math.max(6, Math.min(34, Math.sqrt(Math.max(brightRatio, 0.002)) * 60));

  const screenCentre = screenBox
    ? { x: (screenBox.x + screenBox.width / 2) * W, y: (screenBox.y + screenBox.height / 2) * H }
    : null;

  const present = new Set(boxes.map((b) => b.bucket));

  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-md border border-rule bg-card"
        role="img"
        aria-label={`Diagram of the room reconstructed from ${boxes.length} detections and the light position. No photograph is shown.`}
      >
        <defs>
          <radialGradient id="rtm-light">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.38" />
            <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <pattern id="rtm-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--rule)" strokeWidth="0.25" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#rtm-grid)" />

        {/* Where the light is. */}
        {brightRatio > 0 && (
          <>
            <circle cx={light.x} cy={light.y} r={glowRadius} fill="url(#rtm-light)" />
            <circle cx={light.x} cy={light.y} r="1.1" fill="var(--accent)" />
          </>
        )}

        {/* The line the screen-positioning score is made of. */}
        {screenCentre && screenLightAlignment !== null && (
          <>
            <line
              x1={screenCentre.x}
              y1={screenCentre.y}
              x2={light.x}
              y2={light.y}
              stroke="var(--accent)"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />
            <text
              x={(screenCentre.x + light.x) / 2}
              y={(screenCentre.y + light.y) / 2 - 1.2}
              fontSize="2.6"
              textAnchor="middle"
              fill="var(--muted)"
            >
              {screenLightAlignment.toFixed(2)}
            </text>
          </>
        )}

        {boxes.map((b, i) => {
          const dashed = b.bucket === "clutter";
          return (
            <g key={`${b.cls}-${i}`}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={b.bucket === "screen" ? "var(--accent)" : "transparent"}
                fillOpacity={b.bucket === "screen" ? 0.1 : 0}
                stroke={b.bucket === "clutter" ? "var(--muted)" : "var(--accent)"}
                strokeWidth={b.bucket === "screen" ? 0.7 : 0.45}
                strokeDasharray={dashed ? "1 1" : undefined}
                rx="0.6"
              />
              <text
                x={b.x + 1}
                y={b.y + 3.4}
                fontSize="2.7"
                fill={b.bucket === "clutter" ? "var(--muted)" : "var(--accent)"}
              >
                {b.cls}
              </text>
            </g>
          );
        })}

        {boxes.length === 0 && (
          <text
            x={W / 2}
            y={H / 2}
            fontSize="4"
            textAnchor="middle"
            fill="var(--muted)"
          >
            nothing the model could name
          </text>
        )}
      </svg>

      <figcaption className="space-y-2">
        <p className="max-w-reading text-xs leading-relaxed text-muted">
          This is drawn entirely from the stored numbers. There is no photograph underneath it,
          because there is no photograph anywhere: the frame was read and dropped before this page
          existed. What you see here is the whole of what Room to Mind remembers about your room.
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted">
          {(["screen", "work", "rest", "clutter"] as Bucket[])
            .filter((b) => present.has(b))
            .map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-2 w-3 rounded-[1px] border"
                  style={{
                    borderColor: b === "clutter" ? "var(--muted)" : "var(--accent)",
                    borderStyle: b === "clutter" ? "dashed" : "solid",
                    background: b === "screen" ? "var(--accent)" : "transparent",
                    opacity: b === "screen" ? 0.35 : 1,
                  }}
                />
                {BUCKET_LABEL[b]}
              </li>
            ))}
          {brightRatio > 0 && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--accent)", opacity: 0.4 }}
              />
              Brightest region
            </li>
          )}
        </ul>
      </figcaption>
    </figure>
  );
}
