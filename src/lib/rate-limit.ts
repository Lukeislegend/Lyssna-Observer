type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function key(prefix: string, id: string) {
  return `${prefix}:${id}`;
}

export function rateLimit(
  prefix: string,
  identifier: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const k = key(prefix, identifier);
  let b = buckets.get(k);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(k, b);
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  b.count += 1;
  return { ok: true };
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
