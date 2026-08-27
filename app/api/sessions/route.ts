import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  MAX_STRING,
  PayloadError,
  assertHandle,
  assertInt,
  assertOptionalBoolean,
} from "@/lib/api/guard";

export const dynamic = "force-dynamic";

/** POST a self report against a snapshot that already exists. */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const handle = assertHandle(body.handle);
    if (typeof body.snapshotId !== "string" || body.snapshotId.length > 40) {
      throw new PayloadError("snapshotId is required");
    }

    const concentration = assertInt(body.concentration, "concentration", 1, 7);
    const stress = assertInt(body.stress, "stress", 1, 7);
    const energy = assertInt(body.energy, "energy", 1, 7);
    const durationMin = assertInt(body.durationMin ?? 0, "durationMin", 0, 24 * 60);
    const minutesInSpace =
      body.minutesInSpace === undefined || body.minutesInSpace === null
        ? null
        : assertInt(body.minutesInSpace, "minutesInSpace", 0, 24 * 60);
    const usualWorkspace = assertOptionalBoolean(body.usualWorkspace, "usualWorkspace");

    let note: string | null = null;
    if (typeof body.note === "string" && body.note.trim().length > 0) {
      note = body.note.trim().slice(0, MAX_STRING);
    }

    const user = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
    if (!user) throw new PayloadError("unknown handle");

    // The snapshot has to belong to the same handle, so one person cannot
    // attach a self report to somebody else's room.
    const snapshot = await prisma.snapshot.findFirst({
      where: { id: body.snapshotId, userId: user.id },
      select: { id: true },
    });
    if (!snapshot) throw new PayloadError("that snapshot does not belong to this handle");

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        snapshotId: snapshot.id,
        startedAt: new Date(),
        durationMin,
        concentration,
        stress,
        energy,
        note,
        usualWorkspace,
        minutesInSpace,
      },
      select: { id: true },
    });

    const total = await prisma.session.count();

    return NextResponse.json({ id: session.id, totalResponses: total }, { status: 201 });
  } catch (e) {
    if (e instanceof PayloadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[sessions.POST]", e);
    return NextResponse.json({ error: "Could not store that response." }, { status: 500 });
  }
}
