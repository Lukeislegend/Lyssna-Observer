import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ token: string }> };

/** Public metadata for observer join flow (no secrets beyond token in URL). */
export async function GET(_req: Request, { params }: RouteParams) {
  const { token } = await params;
  const session = await prisma.session.findUnique({
    where: { observerToken: token },
    select: { id: true, slug: true, title: true, observerPasscode: true, botStatus: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    sessionId: session.id,
    slug: session.slug,
    title: session.title,
    botStatus: session.botStatus,
    passcodeRequired: Boolean(session.observerPasscode),
  });
}
