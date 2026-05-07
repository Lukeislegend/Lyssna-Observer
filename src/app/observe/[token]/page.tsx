"use client"

import "@livekit/components-styles"
import NextLink from "next/link"
import {
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

type Meta = { sessionId: string; title: string; passcodeRequired: boolean; botStatus: string }
type Segment = { id: string; text: string; startMs: number; speakerLabel: string }
type LkCreds = { token: string; url: string }

const statusColors: Record<string, string> = {
  IDLE: "gray", JOINING: "yellow", IN_CALL: "green", DONE: "blue", FAILED: "red",
}

function VideoFeed() {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare, Track.Source.Unknown],
    { onlySubscribed: false },
  )
  if (tracks.length === 0) {
    return (
      <Box bg="black" borderRadius="md" w="full" h="400px" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.500" fontSize="sm">Waiting for video stream…</Text>
      </Box>
    )
  }
  return (
    <Stack spacing={2}>
      {tracks.map((track) => (
        <Box key={track.publication.trackSid} borderRadius="md" overflow="hidden" bg="black">
          <VideoTrack trackRef={track} style={{ width: "100%", maxHeight: "480px", objectFit: "contain" }} />
        </Box>
      ))}
    </Stack>
  )
}

export default function ObserverPage() {
  const { token } = useParams<{ token: string }>()
  const toast = useToast()

  const [meta, setMeta] = useState<Meta | null>(null)
  const [passcode, setPasscode] = useState("")
  const [admitted, setAdmitted] = useState(false)
  const [lkCreds, setLkCreds] = useState<LkCreds | null>(null)
  const [transcripts, setTranscripts] = useState<Segment[]>([])
  const [botStatus, setBotStatus] = useState("IDLE")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/sessions/by-observer-token/${token}`)
      if (!res.ok) { toast({ title: "Invalid observer link", status: "error" }); return }
      const data = await res.json()
      setMeta(data)
      setBotStatus(data.botStatus)
      if (!data.passcodeRequired) setAdmitted(true)
    })()
  }, [token, toast])

  // Once admitted, fetch LiveKit token + start polling
  useEffect(() => {
    if (!admitted || !meta) return

    // Get LiveKit credentials for the video stream
    void (async () => {
      const res = await fetch(`/api/sessions/${meta.sessionId}/livekit-token?t=${encodeURIComponent(token)}`)
      if (res.ok) setLkCreds(await res.json())
    })()

    // Poll transcript + bot status
    const t = window.setInterval(async () => {
      const res = await fetch(`/api/sessions/${meta.sessionId}/observer-feed?t=${encodeURIComponent(token)}`)
      if (!res.ok) return
      const data = await res.json()
      setTranscripts(data.transcripts || [])
      setBotStatus(data.botStatus || "IDLE")
    }, 2500)
    return () => window.clearInterval(t)
  }, [admitted, meta, token])

  function handleAdmit(e: React.FormEvent) {
    e.preventDefault()
    setAdmitted(true)
  }

  async function sendMessage() {
    if (!meta || !message.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/sessions/${meta.sessionId}/backchannel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-observer-token": token,
          ...(passcode ? { "x-observer-passcode": passcode } : {}),
        },
        body: JSON.stringify({ body: message }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Send failed")
      setMessage("")
      toast({ title: "Sent to researcher", status: "success" })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Error", status: "error" })
    } finally {
      setSending(false)
    }
  }

  if (!meta) {
    return (
      <Box minH="100vh" bg="gray.50" pt="var(--study-pages-top-nav-height, 64px)">
        <Container maxW="container.xl" py={8}><Text color="gray.500">Loading…</Text></Container>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50" pt="var(--study-pages-top-nav-height, 64px)">
      <Container maxW="container.xl" py={8}>
        <Button as={NextLink} href="/" variant="link" mb={6}>Home</Button>
        <Stack spacing={4}>
          <Stack direction="row" align="center" spacing={3}>
            <Heading size="md">Observer room</Heading>
            <Badge colorScheme={statusColors[botStatus] || "gray"}>{botStatus}</Badge>
          </Stack>
          <Text color="gray.600" fontSize="sm">Session: {meta.title}</Text>

          {!admitted ? (
            <Stack as="form" onSubmit={handleAdmit} spacing={4} maxW="sm">
              <FormControl isRequired>
                <FormLabel>Observer passcode</FormLabel>
                <Input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
              </FormControl>
              <Button type="submit" colorScheme="blue">Join</Button>
            </Stack>
          ) : (
            <Stack direction={{ base: "column", lg: "row" }} spacing={6} align="flex-start">

              {/* Left: Live video + backchannel */}
              <Stack flex={2} spacing={4} minW={0}>
                {lkCreds ? (
                  <LiveKitRoom
                    serverUrl={lkCreds.url}
                    token={lkCreds.token}
                    connect={true}
                    video={false}
                    audio={false}
                  >
                    <RoomAudioRenderer />
                    <VideoFeed />
                  </LiveKitRoom>
                ) : (
                  <Box bg="black" borderRadius="md" w="full" h="400px" display="flex" alignItems="center" justifyContent="center">
                    <Text color="gray.500" fontSize="sm">
                      {botStatus === "JOINING" ? "Bot is joining — video will appear shortly…" : "Waiting for researcher to launch bot…"}
                    </Text>
                  </Box>
                )}

                {/* Backchannel */}
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4} bg="white">
                  <Heading size="sm" mb={1}>Message researcher</Heading>
                  <Text fontSize="sm" color="gray.500" mb={3}>Not visible to participants. Suggest follow-up questions here.</Text>
                  <Stack direction={{ base: "column", md: "row" }} spacing={2}>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about their last comment…" rows={2} flex={1} />
                    <Button alignSelf="flex-end" colorScheme="blue" onClick={sendMessage} isLoading={sending} isDisabled={!message.trim()}>Send</Button>
                  </Stack>
                </Box>
              </Stack>

              {/* Right: Live transcript */}
              <Stack flex={1} spacing={2} minW="260px">
                <Heading size="sm">Live transcript</Heading>
                <Box
                  h="500px"
                  overflowY="auto"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={3}
                  bg="white"
                  fontSize="sm"
                >
                  {transcripts.length === 0 ? (
                    <Text color="gray.500">
                      {botStatus === "IN_CALL" ? "Waiting for speech…" : "Transcript will appear when the bot joins…"}
                    </Text>
                  ) : (
                    transcripts.map((t) => (
                      <Text key={t.id} mb={2}>
                        <Text as="span" fontWeight="semibold" color="gray.600">{t.speakerLabel}: </Text>
                        {t.text}
                      </Text>
                    ))
                  )}
                </Box>
              </Stack>

            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
