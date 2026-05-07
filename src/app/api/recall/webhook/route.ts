import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Recall.ai sends real-time transcript and status events here
export async function POST(req: NextRequest) {
  const body = await req.json()

  const { event, data } = body

  // Bot status updates
  if (event === "bot.status_change") {
    const botId = data?.bot?.id
    const status: string = data?.bot?.status?.code ?? ""
    if (!botId) return NextResponse.json({ ok: true })

    const prismaStatus =
      status === "in_call_recording" || status === "in_call_not_recording"
        ? "IN_CALL"
        : status === "done" || status === "call_ended"
          ? "DONE"
          : status === "fatal"
            ? "FAILED"
            : null

    if (prismaStatus) {
      await prisma.session.updateMany({
        where: { recallBotId: botId },
        data: { botStatus: prismaStatus as "IN_CALL" | "DONE" | "FAILED" },
      })
    }
    return NextResponse.json({ ok: true })
  }

  // Real-time transcript chunks
  if (event === "transcript.data" || event === "transcript.partial_data") {
    const botId = data?.bot?.id
    const words: Array<{ text: string; start_timestamp?: number }> = data?.transcript?.words ?? []
    const speaker: string = data?.transcript?.speaker ?? "Speaker"

    if (!botId || words.length === 0) return NextResponse.json({ ok: true })

    const session = await prisma.session.findFirst({ where: { recallBotId: botId } })
    if (!session) return NextResponse.json({ ok: true })

    const text = words.map((w) => w.text).join(" ").trim()
    const startMs = Math.round((words[0]?.start_timestamp ?? 0) * 1000)

    if (text) {
      await prisma.transcriptSegment.create({
        data: {
          sessionId: session.id,
          startMs,
          speakerLabel: speaker,
          text,
        },
      })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
