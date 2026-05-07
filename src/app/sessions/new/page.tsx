"use client"

import NextLink from "next/link"
import {
  Box,
  Button,
  Code,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react"
import { useState } from "react"

type Created = { researcher: string; observer: string }

export default function NewSessionPage() {
  const toast = useToast()
  const [title, setTitle] = useState("")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [passcode, setPasscode] = useState("")
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<Created | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Interview",
          meetingUrl: meetingUrl.trim(),
          observerPasscode: passcode.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create")
      setCreated(data.urls)
      toast({ title: "Session created", status: "success" })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown",
        status: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <Box minH="100vh" bg="gray.50" pt="var(--study-pages-top-nav-height, 64px)">
        <Container maxW="lg" py={10}>
          <Stack spacing={6}>
            <Heading size="md" color="green.600">Session ready</Heading>
            <Text color="gray.600">
              Send observers their link, then open the researcher link to launch the bot when your call starts.
            </Text>
            <Box borderWidth="1px" borderRadius="md" p={4} bg="white">
              <Text fontWeight="semibold" mb={1}>Your researcher link (private)</Text>
              <Code display="block" p={2} borderRadius="md" wordBreak="break-all" bg="gray.50">
                {created.researcher}
              </Code>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4} bg="white">
              <Text fontWeight="semibold" mb={1}>Observer link (share with team)</Text>
              <Code display="block" p={2} borderRadius="md" wordBreak="break-all" bg="gray.50">
                {created.observer}
              </Code>
              <Text fontSize="sm" color="gray.500" mt={2}>
                Team members open this to watch the live transcript and message you silently.
              </Text>
            </Box>
            <Button as={NextLink} href="/" variant="outline">Back to home</Button>
          </Stack>
        </Container>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50" pt="var(--study-pages-top-nav-height, 64px)">
      <Container maxW="lg" py={10}>
        <Stack spacing={8} as="form" onSubmit={onSubmit}>
          <Stack spacing={1}>
            <Heading size="md">New Observer Session</Heading>
            <Text color="gray.600" fontSize="sm">
              Paste your Zoom, Google Meet, or Teams link. A bot will join and stream the live transcript to your observer room.
            </Text>
          </Stack>

          <FormControl isRequired>
            <FormLabel>Session title</FormLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. User interview – Sarah"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Meeting URL</FormLabel>
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/... or meet.google.com/..."
              type="url"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Observer passcode (optional)</FormLabel>
            <Input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Leave blank for open access"
            />
          </FormControl>

          <Divider />

          <Stack direction="row" spacing={3}>
            <Button type="submit" colorScheme="blue" isLoading={loading}>
              Create session
            </Button>
            <Button as={NextLink} href="/" variant="ghost">Cancel</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
