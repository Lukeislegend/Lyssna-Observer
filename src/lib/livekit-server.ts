import {
  AccessToken,
  IngressClient,
  IngressInput,
  RoomServiceClient,
} from "livekit-server-sdk"

const URL = process.env.LIVEKIT_URL!
const API_KEY = process.env.LIVEKIT_API_KEY!
const API_SECRET = process.env.LIVEKIT_API_SECRET!

// Strip wss:// for HTTP clients
const httpUrl = URL.replace(/^wss?:\/\//, "https://")

export function roomClient() {
  return new RoomServiceClient(httpUrl, API_KEY, API_SECRET)
}

export function ingressClient() {
  return new IngressClient(httpUrl, API_KEY, API_SECRET)
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
  const token = new AccessToken(API_KEY, API_SECRET, {
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
