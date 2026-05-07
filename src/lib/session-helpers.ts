import { randomBytes } from "crypto";

export function randomSlug(len = 10) {
  return randomBytes(len).toString("base64url").slice(0, len);
}

export function observerToken() {
  return randomBytes(24).toString("base64url");
}

export function researcherKey() {
  return randomBytes(32).toString("base64url");
}

export function roomNameForSession(sessionId: string) {
  return `lyssna-observer-${sessionId}`;
}
