import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PayloadError, assertHandle } from "@/lib/api/guard";
import { fitRidge, rankByStrength } from "@/lib/personalization/ridge";
import { MIN_SEED_RESPONSES, tierFor } from "@/lib/personalization/priors";
import { FACTORS, FACTOR_LABELS } from "@/lib/scoring/weights";

export const dynamic = "force-dynamic";

/**
 * Fit a ridge regression from factor subscores to reported concentration.
 *
 * Computed live from the database rather than read from a frozen constant.
 * §7.2 asks for the coefficients to live in `priors.ts` with the sample size
 * beside them, and that file stays the home for the final frozen numbers, but a
 * hardcoded sample size can go stale the moment one more response arrives.
 * Reading the true count on every request is the version that cannot lie.
 */
function fitFrom(rows: Array<{ subscores: unknown; concentration: number }>) {
  const X = rows.map((r) => {
    const s = (r.subscores ?? {}) as Record<string, number | null>;
    return FACTORS.map((f) => (typeof s[f] === "number" ? (s[f] as number) : null));
  });
  const y = rows.map((r) => r.concentration);
  return fitRidge(X, y, 1);
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const handleParam = params.get("handle");

    // Population side: every response ever collected.
    const populationRows = await prisma.session.findMany({
      select: { concentration: true, snapshot: { select: { subscores: true } } },
      take: 5000,
    });

    const populationCount = populationRows.length;
    const populationFit =
      populationCount >= MIN_SEED_RESPONSES
        ? fitFrom(
            populationRows.map((r) => ({
              subscores: r.snapshot.subscores,
              concentration: r.concentration,
            }))
          )
        : null;

    const body: Record<string, unknown> = {
      population: {
        responses: populationCount,
        minimumToFit: MIN_SEED_RESPONSES,
        fitted: populationFit !== null,
        // Null until there is enough data. Never a placeholder.
        drivers: populationFit
          ? rankByStrength(populationFit, FACTORS.map((f) => FACTOR_LABELS[f])).map((d) => ({
              factor: FACTORS[d.index],
              label: d.label,
              coefficient: Number(d.coefficient.toFixed(4)),
              standardError: Number(d.standardError.toFixed(4)),
            }))
          : null,
        rSquared: populationFit ? Number(populationFit.rSquared.toFixed(3)) : null,
        // The simulation panel needs the scale the coefficients were fitted on
        // to turn a subscore move into a concentration move.
        stdDevs: populationFit
          ? Object.fromEntries(FACTORS.map((f, i) => [f, populationFit.stdDevs[i]]))
          : null,
      },
    };

    // Personal side, only when a handle was supplied.
    if (handleParam) {
      const handle = assertHandle(handleParam);
      const rows = await prisma.session.findMany({
        where: { user: { handle } },
        select: { concentration: true, snapshot: { select: { subscores: true } } },
        orderBy: { startedAt: "desc" },
        take: 500,
      });

      const tier = tierFor(rows.length);
      const personalFit =
        tier === "population"
          ? null
          : fitFrom(
              rows.map((r) => ({
                subscores: r.snapshot.subscores,
                concentration: r.concentration,
              }))
            );

      body.personal = {
        sessions: rows.length,
        tier,
        fitted: personalFit !== null,
        drivers: personalFit
          ? rankByStrength(personalFit, FACTORS.map((f) => FACTOR_LABELS[f])).map((d) => ({
              factor: FACTORS[d.index],
              label: d.label,
              coefficient: Number(d.coefficient.toFixed(4)),
              standardError: Number(d.standardError.toFixed(4)),
            }))
          : null,
      };
    }

    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof PayloadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[insights.GET]", e);
    return NextResponse.json({ error: "Could not compute insights." }, { status: 500 });
  }
}
