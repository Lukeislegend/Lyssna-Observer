import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { observerToken } from "@/lib/livekit-server"
import { nanoid } from "nanoid"

type RouteParams = { params: Promise<{ sessionId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params
  const observerTokenParam = new URL(req.url).searchParams.get("t") || ""

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session || session.observerToken !== observerTokenParam) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!session.livekitRoomName) {
    return NextResponse.json({ error: "No LiveKit room for this session" }, { status: 404 })
  }

  const token = await observerToken(session.livekitRoomName, `observer-${nanoid(8)}`)

  return NextResponse.json({
    token,
    url: process.env.LIVEKIT_URL,
    roomName: session.livekitRoomName,
  })
}
