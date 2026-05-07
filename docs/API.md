# Lyssna Observer — API and token contract

## Roles

| Role | LiveKit `metadata.role` | AV publish | AV subscribe | Data / REST |
|------|-------------------------|------------|--------------|-------------|
| `researcher` | `researcher` | yes | yes (filters UI to known roles) | backchannel read; transcript chunk upload |
| `participant` | `participant` | yes | yes (UI hides `observer` identities) | none (MVP) |
| `observer` | `observer` | no | yes | backchannel write via REST |

Participant clients **must** filter remote participants: only render video tiles for identities whose metadata role is `researcher` or `participant` (never `observer`). Observers never publish tracks, so they are invisible to media layout.

## Session lifecycle

1. `POST /api/sessions` — creates DB row + deterministic `roomName`, returns `{ slug, researcherKey, observerToken, urls }`.
2. `GET /api/sessions/{id}/brief?k=` — researcher only; returns `{ title, participantUrl, observerUrl }`.
3. `POST /api/sessions/{id}/tokens` — body `{ role, displayName?, passcode? }` returns `{ token, url, roomName }`.
4. `POST /api/sessions/{id}/egress/start` — researcher-only; starts LiveKit **RoomComposite** egress when cloud credentials support it. Returns `{ egressId }` or `{ skipped: true, reason }`.
5. `POST /api/sessions/{id}/egress/stop` — stops egress by `egressId` stored on session.

## Backchannel

- `POST /api/sessions/{id}/backchannel` — body `{ body, passcode? }`. Observer role only (validated via observer token header). Inserts `Message` with `authorRole=OBSERVER`.
- `GET /api/sessions/{id}/events?k=` — researcher session; returns recent messages + transcript segments (UI polls every few seconds).

## Transcription

- `POST /api/sessions/{id}/transcript/chunk` — researcher-only; `multipart/form-data` field `audio` (`audio/webm`). Server forwards to Deepgram when `DEEPGRAM_API_KEY` is set; otherwise returns `501` with hint to configure key.

## Rate limits

Anonymous IP limits on: session create, token mint, backchannel post, transcript chunk (see `src/lib/rate-limit.ts`).

## Lyssna migration seams

- Replace cookie/session auth with Lyssna `IdentityProvider`.
- Map `Session.orgId` when merging schema.
- Swap `roomName` prefix to Lyssna study IDs.
