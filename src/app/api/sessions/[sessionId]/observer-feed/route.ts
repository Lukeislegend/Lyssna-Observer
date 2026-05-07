import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteParams = { params: Promise<{ sessionId: string }> }

export async function GET(req: Request, { params }: RouteParams) {
  const { sessionId } = await params
  const observerToken = new URL(req.url).searchParams.get("t") || ""

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session || session.observerToken !== observerToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const transcripts = await prisma.transcriptSegment.findMany({
    where: { sessionId: session.id },
    orderBy: { startMs: "asc" },
    take: 200,
  })

  return NextResponse.json({ transcripts, botStatus: session.botStatus })
}
