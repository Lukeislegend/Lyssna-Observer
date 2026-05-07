import NextLink from "next/link";
import { Box, Button, Container, Heading, Stack, Text } from "@chakra-ui/react";

export default function HomePage() {
  return (
    <Box minH="100vh" bg="gray.50" pt="var(--study-pages-top-nav-height, 64px)">
      <Container maxW="lg" py={12}>
        <Stack spacing={6}>
          <Heading size="lg" color="gray.800">
            Lyssna Observer
          </Heading>
          <Text color="gray.600">
            MVP: hosted interview room, view-only observers with a researcher-only
            backchannel, and optional Deepgram transcription.
          </Text>
          <Button as={NextLink} href="/sessions/new" colorScheme="blue" w="fit-content">
            New session
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
