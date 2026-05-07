import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteParams = { params: Promise<{ sessionId: string }> }

export async function GET(req: Request, { params }: RouteParams) {
  const { sessionId } = await params
  const researcherKey =
    req.headers.get("x-researcher-key") || new URL(req.url).searchParams.get("k") || ""

  const session = await prisma.session.findFirst({
    where: { OR: [{ id: sessionId }, { slug: sessionId }] },
  })
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!researcherKey || researcherKey !== session.researcherKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin

  return NextResponse.json({
    sessionId: session.id,
    title: session.title,
    meetingUrl: session.meetingUrl,
    botStatus: session.botStatus,
    observerUrl: `${base}/observe/${session.observerToken}`,
  })
}
