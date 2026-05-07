import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createBot, stopBot } from "@/lib/recall"
import { ingressClient } from "@/lib/livekit-server"

type RouteParams = { params: Promise<{ sessionId: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params
  const researcherKey = req.headers.get("x-researcher-key")

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session || session.researcherKey !== researcherKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.recallBotId) {
    return NextResponse.json({ error: "Bot already running" }, { status: 409 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"
  const webhookUrl = `${base}/api/recall/webhook`

  // Get the RTMP ingress URL for this session's LiveKit room
  let rtmpUrl: string | undefined
  if (session.livekitIngressId) {
    try {
      const client = ingressClient()
      const ingresses = await client.listIngress({ roomName: session.livekitRoomName ?? "" })
      const ingress = ingresses.find((i) => i.ingressId === session.livekitIngressId)
      if (ingress?.url && ingress?.streamKey) {
        rtmpUrl = `${ingress.url}/${ingress.streamKey}`
      }
    } catch (err) {
      console.error("[bot/start] Could not fetch ingress URL:", err)
    }
  }

  let bot: { id: string }
  try {
    bot = await createBot(session.meetingUrl, session.id, webhookUrl, rtmpUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error from Recall.ai"
    console.error("[bot/start]", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { recallBotId: bot.id, botStatus: "JOINING" },
  })

  return NextResponse.json({ botId: bot.id, status: "JOINING", hasVideo: !!rtmpUrl })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params
  const researcherKey = req.headers.get("x-researcher-key")

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session || session.researcherKey !== researcherKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!session.recallBotId) {
    return NextResponse.json({ error: "No bot running" }, { status: 404 })
  }

  try {
    await stopBot(session.recallBotId)
  } catch (err) {
    console.error("[bot/stop]", err)
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { botStatus: "DONE" },
  })

  return NextResponse.json({ status: "DONE" })
}
