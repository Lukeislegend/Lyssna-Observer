# Lyssna Observer (MVP)

Greenfield MVP for moderated interviews with:

- **Researcher** and **participant** in a LiveKit room (publish A/V).
- **Observers** join the same room **view-only** (no publish); participant UI hides observer tiles. Backchannel posts are **HTTP-only** to the researcher (not via LiveKit data to the participant).
- **Transcription**: researcher mic is chunked to `POST /api/sessions/.../transcript/chunk` when `DEEPGRAM_API_KEY` is set (see limitations below).
- **Optional egress**: RoomComposite to S3 when LiveKit + S3 env vars are configured.

## Quick start

1. Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_APP_URL`.

2. Push the schema (local Postgres):

   ```bash
   npx prisma db push
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000/sessions/new](http://localhost:3000/sessions/new), create a session, and use the three links (researcher includes `?k=` — keep it secret).

## API contract

See [`docs/API.md`](docs/API.md) for roles, token minting, egress, and rate limits.

## Lyssna migration

- Replace stub identity with Lyssna auth; thread `orgId` / study IDs into `Session` when merging the schema.
- Mount routes under the main app shell so **Chakra** theme tokens (`gray.800`, `gray.200`, `--study-pages-top-nav-height`) stay consistent.
- Avoid double-loading **Intercom / Stripe / Headway** if the parent layout already bootstraps them.

## Transcription note

The MVP sends **researcher microphone** WebM chunks to Deepgram prerecorded for pragmatic demo quality. A production “mixed room” tap belongs in a **long-lived worker** using LiveKit egress or the agent pipeline—not in a serverless route.

## Security MVP caveats

- `researcherKey` and `observerToken` are capability URLs; treat links as secrets.
- Observer passcode is stored **plaintext** for demo speed — hash before production.
- Participant join is gated only by unguessable `slug` length — add auth when merging into Lyssna.

## Egress (optional)

Set `EGRESS_S3_BUCKET`, `EGRESS_S3_ACCESS_KEY`, `EGRESS_S3_SECRET_KEY`, and `EGRESS_S3_REGION`. Without them, **Start room composite egress** returns `{ skipped: true, reason: ... }` and the in-browser observer experience still works.
