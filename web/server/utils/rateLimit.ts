import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export const SCAN_RATE_LIMIT = 20
export const SCAN_RATE_WINDOW_MS = 60_000

function prune(now: number) {
  if (buckets.size < 2_000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSec: number
}

/** Fixed-window limiter: default 20 requests per 60s per key (usually client IP). */
export function consumeRateLimit(
  key: string,
  limit = SCAN_RATE_LIMIT,
  windowMs = SCAN_RATE_WINDOW_MS,
): RateLimitResult {
  const now = Date.now()
  prune(now)

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const remaining = Math.max(0, limit - bucket.count)
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSec,
  }
}

export function clientIpFromEvent(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}
