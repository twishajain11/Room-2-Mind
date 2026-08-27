import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PayloadError, assertHandle, assertNumericOnly } from "@/lib/api/guard";

export const dynamic = "force-dynamic";

/**
 * POST a feature vector.
 *
 * The body carries numbers and enum labels only, and `assertNumericOnly` makes
 * that a server-enforced rule rather than a client-side promise. No image or
 * audio field exists to send, and one would be rejected if it did.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const handle = assertHandle(body.handle);
    const mode = body.mode === "recovery" ? "recovery" : "standard";

    if (typeof body.eli !== "number" || !Number.isFinite(body.eli)) {
      throw new PayloadError("eli must be a finite number");
    }
    if (typeof body.hasAudio !== "boolean") {
      throw new PayloadError("hasAudio must be true or false");
    }

    assertNumericOnly(body.features, "features");
    assertNumericOnly(body.subscores, "subscores");

    const user = await prisma.user.upsert({
      where: { handle },
      create: { handle },
      update: {},
    });

    const snapshot = await prisma.snapshot.create({
      data: {
        userId: user.id,
        mode,
        features: body.features,
        subscores: body.subscores,
        eli: body.eli,
        hasAudio: body.hasAudio,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ id: snapshot.id, createdAt: snapshot.createdAt }, { status: 201 });
  } catch (e) {
    if (e instanceof PayloadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[snapshots.POST]", e);
    return NextResponse.json({ error: "Could not store that snapshot." }, { status: 500 });
  }
}

/** GET one handle's snapshot history, newest first. */
export async function GET(request: Request) {
  try {
    const handle = assertHandle(new URL(request.url).searchParams.get("handle"));

    const snapshots = await prisma.snapshot.findMany({
      where: { user: { handle } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        mode: true,
        eli: true,
        hasAudio: true,
        subscores: true,
        features: true,
      },
    });

    return NextResponse.json({ snapshots });
  } catch (e) {
    if (e instanceof PayloadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[snapshots.GET]", e);
    return NextResponse.json({ error: "Could not read that history." }, { status: 500 });
  }
}
