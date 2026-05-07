import {
  AccessToken,
  IngressClient,
  IngressInput,
  RoomServiceClient,
} from "livekit-server-sdk"

function getHttpUrl() {
  const url = process.env.LIVEKIT_URL
  if (!url) throw new Error("LIVEKIT_URL is not configured")
  return url.replace(/^wss?:\/\//, "https://")
}

function apiKey() {
  return process.env.LIVEKIT_API_KEY!
}

function apiSecret() {
  return process.env.LIVEKIT_API_SECRET!
}

export function roomClient() {
  return new RoomServiceClient(getHttpUrl(), apiKey(), apiSecret())
}

export function ingressClient() {
  return new IngressClient(getHttpUrl(), apiKey(), apiSecret())
}

export async function createRoom(roomName: string) {
  const client = roomClient()
  return client.createRoom({ name: roomName, emptyTimeout: 600 })
}

export async function createRtmpIngress(roomName: string, sessionId: string) {
  const client = ingressClient()
  return client.createIngress(IngressInput.RTMP_INPUT, {
    name: `recall-${sessionId}`,
    roomName,
    participantName: "Recall Bot",
    participantIdentity: `recall-bot-${sessionId}`,
  })
}

export async function deleteIngress(ingressId: string) {
  const client = ingressClient()
  return client.deleteIngress(ingressId)
}

export function observerToken(roomName: string, participantId: string) {
  const token = new AccessToken(apiKey(), apiSecret(), {
    identity: participantId,
    ttl: "4h",
  })
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: false,
    canSubscribe: true,
    canPublishData: false,
  })
  return token.toJwt()
}
