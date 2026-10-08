import { clientIpFromEvent, consumeRateLimit, SCAN_RATE_LIMIT } from '../utils/rateLimit'

/**
 * Soft rate limit for scan API: 20 requests / 60s / IP.
 * On Vercel serverless this is per-instance; pair with a Firewall WAF rule for hard limits.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path !== '/api/scan' && !path.startsWith('/api/scan/')) return

  const ip = clientIpFromEvent(event)
  const result = consumeRateLimit(`scan:${ip}`)

  setResponseHeaders(event, {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  })

  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', String(result.retryAfterSec))
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Scan rate limit exceeded. Max ${SCAN_RATE_LIMIT} requests per minute. Retry in ${result.retryAfterSec}s.`,
    })
  }
})
