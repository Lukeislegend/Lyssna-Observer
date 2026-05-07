import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { createRoom, createRtmpIngress } from "@/lib/livekit-server"
import { nanoid } from "nanoid"

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  const rl = rateLimit("create_session", ip, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  let body: { title?: string; meetingUrl?: string; observerPasscode?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const title = (body.title || "Untitled session").slice(0, 200)
  const meetingUrl = body.meetingUrl?.trim()
  if (!meetingUrl) {
    return NextResponse.json({ error: "meetingUrl is required" }, { status: 400 })
  }

  const observerPasscode =
    body.observerPasscode?.trim() || process.env.OBSERVER_DEFAULT_PASSCODE?.trim() || null

  // Create session first to get the ID
  const session = await prisma.session.create({
    data: {
      slug: nanoid(14),
      researcherKey: nanoid(32),
      observerToken: nanoid(32),
      title,
      meetingUrl,
      observerPasscode,
    },
  })

  // Create LiveKit room + RTMP ingress for the observer stream
  const roomName = `lyssna-${session.id}`
  let livekitIngressId: string | null = null

  try {
    await createRoom(roomName)
    const ingress = await createRtmpIngress(roomName, session.id)
    livekitIngressId = ingress.ingressId ?? null

    await prisma.session.update({
      where: { id: session.id },
      data: { livekitRoomName: roomName, livekitIngressId },
    })
  } catch (err) {
    console.error("[session/create] LiveKit setup failed:", err)
    // Continue without LiveKit — session still works for transcript-only
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"

  return NextResponse.json({
    id: session.id,
    urls: {
      researcher: `${base}/r/${session.slug}?k=${encodeURIComponent(session.researcherKey)}`,
      observer: `${base}/observe/${session.observerToken}`,
    },
  })
}
