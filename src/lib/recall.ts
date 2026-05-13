const BASE = process.env.RECALL_API_URL!
const KEY = process.env.RECALL_API_KEY!

function headers() {
  return {
    Authorization: `Token ${KEY}`,
    "Content-Type": "application/json",
  }
}

export async function createBot(
  meetingUrl: string,
  sessionId: string,
  webhookUrl: string,
  rtmpUrl?: string,
) {
  const isPublic = webhookUrl.startsWith("https://")

  const body: Record<string, unknown> = {
    meeting_url: meetingUrl,
    bot_name: "Lyssna Observer",
    webhook_url: isPublic ? webhookUrl : undefined,
    metadata: { sessionId },
  }


  // Stream composite video to LiveKit via RTMP
  if (rtmpUrl) {
    body.recording_config = {
      video_mixed_flv: {},
      realtime_endpoints: [
        {
          type: "rtmp",
          url: rtmpUrl,
          events: ["video_mixed_flv.data"],
        },
      ],
    }
  }

  const res = await fetch(`${BASE}/bot`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Recall createBot failed (${res.status}): ${err}`)
  }
  return res.json()
}

export async function stopBot(botId: string) {
  const res = await fetch(`${BASE}/bot/${botId}/leave_call`, {
    method: "POST",
    headers: headers(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Recall stopBot failed: ${err}`)
  }
  return res.json()
}

export async function getBotStatus(botId: string) {
  const res = await fetch(`${BASE}/bot/${botId}`, { headers: headers() })
  if (!res.ok) throw new Error("Recall getBotStatus failed")
  return res.json()
}
