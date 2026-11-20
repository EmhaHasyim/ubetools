import { describe, expect, test } from 'vitest'
import { clientIp, createRateLimiter } from './rate-limit.ts'

const start = 1_000_000

describe('clientIp', () => {
	test('uses Cloudflare request metadata, not a client header', () => {
		const request = new Request('https://ubetools.test', {
			headers: { 'cf-connecting-ip': '1.2.3.4' },
		})
		Object.defineProperty(request, 'cf', { value: { colo: 'SIN' } })
		expect(clientIp(request)).toBe('SIN:1.2.3.4')
	})

	test('rejects a request without a client IP', () => {
		expect(clientIp(new Request('https://ubetools.test'))).toBeNull()
	})

	test('allows a local request without Cloudflare metadata', () => {
		expect(
			clientIp(
				new Request('https://ubetools.test', { headers: { 'cf-connecting-ip': '1.2.3.4' } }),
			),
		).toBe('local:1.2.3.4')
	})
})

describe('createRateLimiter', () => {
	test('allows requests under the limit', () => {
		const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })

		expect(limiter.check('ip', start)).toEqual({ allowed: true, retryAfter: 0 })
		expect(limiter.check('ip', start + 1_000)).toEqual({ allowed: true, retryAfter: 0 })
		expect(limiter.check('ip', start + 2_000)).toEqual({ allowed: true, retryAfter: 0 })
	})

	test('blocks requests over the limit with a retry window', () => {
		const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })

		limiter.check('ip', start)
		limiter.check('ip', start)

		expect(limiter.check('ip', start + 10_000)).toEqual({ allowed: false, retryAfter: 50 })
	})

	test('resets once the window has passed', () => {
		const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })

		limiter.check('ip', start)

		expect(limiter.check('ip', start + 59_999).allowed).toBe(false)
		expect(limiter.check('ip', start + 60_000)).toEqual({ allowed: true, retryAfter: 0 })
	})

	test('counts each IP separately', () => {
		const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })

		expect(limiter.check('a', start).allowed).toBe(true)
		expect(limiter.check('b', start).allowed).toBe(true)
		expect(limiter.check('a', start).allowed).toBe(false)
	})
})
