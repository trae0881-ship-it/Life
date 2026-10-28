import { trustProxyHeaders } from "./proxy-trust.ts";

type Bucket = { timestamps: number[]; touchedAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const previous = buckets.get(key);
  const timestamps = (previous?.timestamps ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, { timestamps, touchedAt: now });
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - timestamps[0])) / 1000)) };
  }
  timestamps.push(now);
  buckets.set(key, { timestamps, touchedAt: now });
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) if (now - bucket.touchedAt > windowMs) buckets.delete(bucketKey);
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRateLimitsForTests() {
  buckets.clear();
}

export function requestRateLimitKey(request: Request) {
  const trustedProxy = trustProxyHeaders();
  const forwarded = trustedProxy
    ? request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean)
    : undefined;
  const ip = forwarded?.at(-1) ?? (trustedProxy ? request.headers.get("x-real-ip") : null) ?? "unknown";
  return `${ip}:${new URL(request.url).pathname}`;
}
