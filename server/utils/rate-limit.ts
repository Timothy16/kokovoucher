// server/utils/rate-limit.ts
// Per-IP limits on public endpoints, counted in Postgres so every serverless instance shares them.
// These sit on top of the per-voucher lockout (5 wrong keys) — they stop one client from
// spraying guesses across many vouchers or order references.
import type { H3Event } from 'h3'

/** The caller's IP. On Vercel `x-real-ip` is set by the platform and can't be spoofed by clients. */
function clientIp(event: H3Event) {
  return getHeader(event, 'x-real-ip') || getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

export async function rateLimit(event: H3Event, bucket: string, limit: number, windowSeconds: number) {
  const { data: allowed, error } = await useServiceClient().rpc('hit_rate_limit', {
    p_key: `${bucket}:${clientIp(event)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds
  })
  // If the limiter itself is down, let the request through: the per-voucher lockout still applies.
  if (error) {
    console.error('[rate-limit] check failed', bucket, error.message)
    return
  }
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', windowSeconds)
    throw createError({ statusCode: 429, message: 'Too many attempts from your connection. Please wait a few minutes and try again.' })
  }
}
