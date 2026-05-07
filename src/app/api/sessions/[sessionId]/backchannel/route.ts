import { NextResponse } from "next/server";
import { SessionRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const ip = getClientIp(req.headers);
  const rl = rateLimit("backchannel", ip, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    );
  }

  const { sessionId } = await params;
  const session = await prisma.session.findFirst({
    where: { OR: [{ id: sessionId }, { slug: sessionId }] },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { body: string; observerPasscode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body.body || "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const hdr = req.headers.get("x-observer-token");
  if (hdr !== session.observerToken) {
    return NextResponse.json({ error: "Observer token required" }, { status: 401 });
  }
  if (session.observerPasscode) {
    const pc = body.observerPasscode || req.headers.get("x-observer-passcode");
    if (!pc || pc !== session.observerPasscode) {
      return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
    }
  }

  const msg = await prisma.message.create({
    data: {
      sessionId: session.id,
      authorRole: SessionRole.OBSERVER,
      body: text,
    },
  });

  return NextResponse.json({ id: msg.id, createdAt: msg.createdAt });
}
