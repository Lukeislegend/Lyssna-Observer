"use client"

import NextLink from "next/link"
import {
  Badge,
  Box,
  Button,
  Code,
  Container,
  Heading,
  ListItem,
  Stack,
  Text,
  UnorderedList,
  useToast,
} from "@chakra-ui/react"
import { useParams, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

type BotStatus = "IDLE" | "JOINING" | "IN_CALL" | "DONE" | "FAILED"
type Message = { id: string; body: string; createdAt: string }
type Segment = { id: string; text: string; startMs: number; speakerLabel: string }

const statusColors: Record<BotStatus, string> = {
  IDLE: "gray",
  JOINING: "yellow",
  IN_CALL: "green",
  DONE: "blue",
  FAILED: "red",
}

function ResearcherInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const researcherKey = searchParams.get("k") || ""
  const toast = useToast()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [observerUrl, setObserverUrl] = useState<string | null>(null)
  const [botStatus, setBotStatus] = useState<BotStatus>("IDLE")
  const [messages, setMessages] = useState<Message[]>([])
  const [transcripts, setTranscripts] = useState<Segment[]>([])
  const [botLoading, setBotLoading] = useState(false)

  // Load session brief
  useEffect(() => {
    if (!researcherKey) return
    void (async () => {
      const res = await fetch(`/api/sessions/${slug}/brief?k=${encodeURIComponent(researcherKey)}`)
      if (!res.ok) return
      const b = await res.json()
      setSessionId(b.sessionId)
      setObserverUrl(b.observerUrl)
      setBotStatus(b.botStatus)
    })()
  }, [researcherKey, slug])

  // Poll for events (messages + transcripts + bot status)
  useEffect(() => {
    if (!researcherKey) return
    const t = window.setInterval(async () => {
      const res = await fetch(`/api/sessions/${slug}/events?k=${encodeURIComponent(researcherKey)}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
      setTranscripts(data.transcripts || [])
      setBotStatus(data.botStatus || "IDLE")
    }, 2500)
    return () => window.clearInterval(t)
  }, [researcherKey, slug])

  async function startBot() {
    if (!sessionId) return
    setBotLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/bot`, {
        method: "POST",
        headers: { "x-researcher-key": researcherKey },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start bot")
      setBotStatus("JOINING")
      toast({ title: "Bot is joining the call…", status: "success" })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Error", status: "error" })
    } finally {
      setBotLoading(false)
    }
  }

  async function stopBot() {
    if (!sessionId) return
    setBotLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/bot`, {
        method: "DELETE",
        headers: { "x-researcher-key": researcherKey },
      })
      if (!res.ok) throw new Error("Failed to stop bot")
      setBotStatus("DONE")
      toast({ title: "Bot removed from call", status: "info" })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Error", status: "error" })
    } finally {
      setBotLoading(false)
    }
  }

  if (!researcherKey) {
    return (
      <Text color="red.600">
        Open this page using the researcher link (includes <Code>k=</Code> param).
      </Text>
    )
  }

  return (
    <Stack spacing={6}>
      <Stack direction={{ base: "column", md: "row" }} spacing={4} align="flex-start">
        {/* Left: Bot controls + observer link */}
        <Stack flex={1} spacing={4}>
          <Stack direction="row" align="center" spacing={3}>
            <Heading size="md">Researcher</Heading>
            <Badge colorScheme={statusColors[botStatus]}>{botStatus}</Badge>
          </Stack>

          {observerUrl && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>Observer link (share with team)</Text>
              <Code display="block" p={2} borderRadius="md" wordBreak="break-all" bg="gray.50" fontSize="xs">
                {observerUrl}
              </Code>
            </Box>
          )}

          <Stack direction="row" spacing={2}>
            <Button
              colorScheme="green"
              size="sm"
              onClick={startBot}
              isLoading={botLoading}
              isDisabled={botStatus === "IN_CALL" || botStatus === "JOINING" || botStatus === "DONE"}
            >
              Launch bot
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={stopBot}
              isLoading={botLoading}
              isDisabled={botStatus !== "IN_CALL" && botStatus !== "JOINING"}
            >
              Remove bot
            </Button>
          </Stack>

          <Text fontSize="xs" color="gray.500">
            The bot joins your Zoom/Meet/Teams call and streams the transcript live to the observer room.
          </Text>
        </Stack>

        {/* Right: Backchannel messages */}
        <Stack flex={1} spacing={2} minW="220px">
          <Heading size="sm">Observer messages</Heading>
          <Box
            maxH="180px"
            overflowY="auto"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={3}
            bg="white"
          >
            {messages.length === 0 ? (
              <Text fontSize="sm" color="gray.500">No messages yet — observers will appear here.</Text>
            ) : (
              <UnorderedList spacing={1} fontSize="sm">
                {messages.map((m) => (
                  <ListItem key={m.id}>{m.body}</ListItem>
                ))}
              </UnorderedList>
            )}
          </Box>
        </Stack>
      </Stack>

      {/* Live transcript */}
      <Stack spacing={2}>
        <Heading size="sm">Live transcript</Heading>
        <Box
          maxH="300px"
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
              {botStatus === "IDLE"
                ? "Launch the bot to start transcription."
                : botStatus === "JOINING"
                  ? "Bot is joining the call — transcript will appear here…"
                  : "Waiting for speech…"}
            </Text>
          ) : (
            transcripts.map((t) => (
              <Text key={t.id} mb={1}>
                <Text as="span" fontWeight="semibold" color="gray.600">{t.speakerLabel}: </Text>
                {t.text}
              </Text>
            ))
          )}
        </Box>
      </Stack>
    </Stack>
  )
}

export default function ResearcherPage() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) return null

  return (
    <Box minH="100vh" bg="gray.50" pt="var(--study-pages-top-nav-height, 64px)">
      <Container maxW="container.xl" py={8}>
        <Button as={NextLink} href="/" variant="link" mb={6}>Home</Button>
        <Suspense fallback={<Text>Loading…</Text>}>
          <ResearcherInner slug={slug} />
        </Suspense>
      </Container>
    </Box>
  )
}
