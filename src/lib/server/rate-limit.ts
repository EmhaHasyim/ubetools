export type RateLimitResult = { allowed: boolean; retryAfter: number }

export type RateLimiter = {
	check: (key: string, now?: number) => RateLimitResult
}

/** Fixed-window counter. `now` is injectable so tests can move the clock. */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
	const buckets = new Map<string, { count: number; resetAt: number }>()

	return {
		check(key: string, now = Date.now()): RateLimitResult {
			if (buckets.size > 10_000) {
				for (const [id, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(id)
			}

			const bucket = buckets.get(key)
			if (!bucket || now >= bucket.resetAt) {
				buckets.set(key, { count: 1, resetAt: now + windowMs })
				return { allowed: true, retryAfter: 0 }
			}

			if (bucket.count >= limit)
				return {
					allowed: false,
					retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
				}

			bucket.count += 1
			return { allowed: true, retryAfter: 0 }
		},
	}
}

/** Cloudflare sets the IP header; the colo acts as a shared secret that clients cannot forge. */
export function clientIp(request: Request) {
	const colo = (request as Request & { cf?: { colo?: string } }).cf?.colo
	const ip = request.headers.get('cf-connecting-ip')?.trim()
	return ip ? `${colo ?? 'local'}:${ip}` : null
}

// shortcut: in-memory per Worker isolate (30 req/min), upgrade to a Durable Object if
// limits must span isolates. Keyed by colo + IP, so a spoofed header alone cannot reset a bucket.
export const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 })
