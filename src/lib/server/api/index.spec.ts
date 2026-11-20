import { afterEach, describe, expect, test, vi } from 'vitest'
import { app } from './index.ts'
import { withCf } from './test-helpers.ts'

const VIDEO_ID = 'dQw4w9WgXcQ'

type ProblemBody = { type: string; title: string; status: number; detail: string }
type ThumbnailBody = {
	videoId: string
	thumbnails: { variant: string; label: string; width: number; height: number; url: string }[]
}

function variantOf(input: RequestInfo | URL) {
	return String(input).split('/').pop()?.replace('.jpg', '') ?? ''
}

function mockFetch(statusFor: (variant: string) => number) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			return new Response(null, { status: statusFor(variantOf(input)) })
		}),
	)
}

function resolve(url: string, ip: string) {
	return app.handle(
		withCf(
			new Request('http://localhost/api/tools/youtube-thumbnail', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
				body: JSON.stringify({ url }),
			}),
		),
	)
}

function download(query: string, ip: string) {
	return app.handle(
		withCf(
			new Request(`http://localhost/api/tools/youtube-thumbnail/download?${query}`, {
				headers: { 'cf-connecting-ip': ip },
			}),
		),
	)
}

function tags(url: string, ip: string) {
	return app.handle(
		withCf(
			new Request('http://localhost/api/tools/youtube-tags', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
				body: JSON.stringify({ url }),
			}),
		),
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('API response headers', () => {
	test('sets security headers on validation errors', async () => {
		const result = await app.handle(
			withCf(
				new Request('http://localhost/api/tools/youtube-tags', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ url: 1 }),
				}),
			),
		)
		expect(result.status).toBe(400)
		expect(result.headers.get('x-content-type-options')).toBe('nosniff')
		expect(result.headers.get('x-frame-options')).toBe('DENY')
		expect(result.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
	})
})

describe('POST /api/tools/youtube-thumbnail', () => {
	test('returns all five variants in resolution order', async () => {
		mockFetch(() => 200)

		const response = await resolve(`https://www.youtube.com/watch?v=${VIDEO_ID}`, '10.0.0.1')
		expect(response.status).toBe(200)

		const body = (await response.json()) as ThumbnailBody
		expect(body.videoId).toBe(VIDEO_ID)
		expect(body.thumbnails.map((thumbnail) => thumbnail.variant)).toEqual([
			'maxresdefault',
			'sddefault',
			'hqdefault',
			'mqdefault',
			'default',
		])
		expect(body.thumbnails[0]).toMatchObject({
			label: 'HD Maksimal',
			width: 1280,
			height: 720,
			url: `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
		})
	})

	test('skips variants that respond with an error', async () => {
		mockFetch((variant) => (variant === 'maxresdefault' ? 404 : 200))

		const response = await resolve(`https://youtu.be/${VIDEO_ID}`, '10.0.0.2')
		expect(response.status).toBe(200)

		const body = (await response.json()) as ThumbnailBody
		expect(body.thumbnails.map((thumbnail) => thumbnail.variant)).toEqual([
			'sddefault',
			'hqdefault',
			'mqdefault',
			'default',
		])
	})

	test('returns 404 problem+json when no variant exists', async () => {
		mockFetch(() => 404)

		const response = await resolve(`https://www.youtube.com/shorts/${VIDEO_ID}`, '10.0.0.3')
		expect(response.status).toBe(404)
		expect(response.headers.get('content-type')).toBe('application/problem+json')

		const body = (await response.json()) as ProblemBody
		expect(body).toMatchObject({ type: 'video-not-found', status: 404 })
		expect(body.detail.length).toBeGreaterThan(0)
	})

	test('returns 502 problem+json when every upstream probe fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('network down')
			}),
		)

		const response = await resolve(`https://www.youtube.com/watch?v=${VIDEO_ID}`, '10.0.0.4')
		expect(response.status).toBe(502)
		expect(response.headers.get('content-type')).toBe('application/problem+json')

		const body = (await response.json()) as ProblemBody
		expect(body).toMatchObject({ type: 'upstream-unavailable', status: 502 })
	})

	test('returns 400 problem+json for a link that is not YouTube', async () => {
		const response = await resolve('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', '10.0.0.5')
		expect(response.status).toBe(400)

		const body = (await response.json()) as ProblemBody
		expect(body).toMatchObject({ type: 'invalid-youtube-url', status: 400 })
	})

	test('rate limits per IP with Retry-After', async () => {
		mockFetch(() => 200)

		let response: Response | undefined
		for (let attempt = 0; attempt < 31; attempt += 1)
			response = await resolve(`https://youtu.be/${VIDEO_ID}`, '10.9.9.9')

		expect(response?.status).toBe(429)
		expect(response?.headers.get('retry-after')).toBe('60')
		expect(response?.headers.get('content-type')).toBe('application/problem+json')
	})
})

describe('POST /api/tools/youtube-tags', () => {
	test('returns channel keywords from a YouTube channel page', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						'<script>channelMetadataRenderer</script>' +
							'<meta name="keywords" content="mrbeast6000, beast, mrbeast">',
					),
			),
		)

		const response = await tags('https://www.youtube.com/@MrBeast', '10.0.2.1')
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			kind: 'channel',
			state: 'ok',
			tags: ['mrbeast6000', 'beast', 'mrbeast'],
		})
	})

	test('returns video tags from a watch page', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						'<script>"playabilityStatus":{"status":"OK"}</script>' +
							'<meta name="keywords" content="rick astley, rickroll">',
					),
			),
		)

		const response = await tags('https://youtu.be/dQw4w9WgXcQ', '10.0.2.2')
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			kind: 'video',
			state: 'ok',
			tags: ['rick astley', 'rickroll'],
		})
	})

	test('returns hidden state with no tags', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('<script>"playabilityStatus":{"status":"OK"}</script>')),
		)

		const response = await tags(`https://www.youtube.com/watch?v=${VIDEO_ID}`, '10.0.2.3')
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ kind: 'video', state: 'hidden', tags: [] })
	})

	test('rejects non-YouTube links without fetching', async () => {
		const fetcher = vi.fn<() => Promise<Response>>()
		vi.stubGlobal('fetch', fetcher)

		const response = await tags('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', '10.0.2.4')
		expect(response.status).toBe(400)
		expect(fetcher).not.toHaveBeenCalled()
	})

	test('maps upstream failure to 502 problem+json', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('network down')
			}),
		)

		const response = await tags('https://www.youtube.com/@MrBeast', '10.0.2.5')
		expect(response.status).toBe(502)
		expect(response.headers.get('content-type')).toBe('application/problem+json')
	})

	test('maps a body read failure to 502 problem+json', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						new ReadableStream<Uint8Array>({
							start(controller) {
								controller.error(new TypeError('stream aborted'))
							},
						}),
					),
			),
		)

		const response = await tags(`https://www.youtube.com/watch?v=${VIDEO_ID}`, '10.0.2.61')
		expect(response.status).toBe(502)
		expect(response.headers.get('content-type')).toBe('application/problem+json')
		const body = (await response.json()) as ProblemBody
		expect(body.type).toBe('upstream-unavailable')
	})

	test('maps an unavailable video to 404 problem+json', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('<script>"playabilityStatus":{"status":"ERROR"}</script>')),
		)

		const response = await tags(`https://www.youtube.com/watch?v=${VIDEO_ID}`, '10.0.2.71')
		expect(response.status).toBe(404)
		expect(response.headers.get('content-type')).toBe('application/problem+json')
		const body = (await response.json()) as ProblemBody
		expect(body.type).toBe('video-not-found')
	})

	test('maps an unrecognized page to 502 problem+json', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('<html>consent wall</html>')),
		)

		const response = await tags(`https://www.youtube.com/watch?v=${VIDEO_ID}`, '10.0.2.81')
		expect(response.status).toBe(502)
		expect(response.headers.get('content-type')).toBe('application/problem+json')
		const body = (await response.json()) as ProblemBody
		expect(body.type).toBe('upstream-unavailable')
	})
})

describe('GET /api/tools/youtube-thumbnail/download', () => {
	test('streams the image as an attachment', async () => {
		const bytes = new Uint8Array([1, 2, 3])
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(bytes, { status: 200, headers: { 'content-type': 'image/jpeg' } }),
			),
		)

		const response = await download(`id=${VIDEO_ID}&variant=hqdefault`, '10.0.1.1')
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/jpeg')
		expect(response.headers.get('content-disposition')).toBe(
			`attachment; filename="ubetools-${VIDEO_ID}-hqdefault.jpg"`,
		)
		expect(response.headers.get('x-content-type-options')).toBe('nosniff')
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
	})

	test('returns 404 problem+json when the variant is missing upstream', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 404 })),
		)

		const response = await download(`id=${VIDEO_ID}&variant=sddefault`, '10.0.1.2')
		expect(response.status).toBe(404)
		expect(response.headers.get('content-type')).toBe('application/problem+json')

		const body = (await response.json()) as ProblemBody
		expect(body.type).toBe('thumbnail-not-found')
	})

	test('rejects malformed IDs and variants', async () => {
		const badId = await download('id=short&variant=default', '10.0.1.3')
		expect(badId.status).toBe(400)

		const badVariant = await download(`id=${VIDEO_ID}&variant=huge`, '10.0.1.4')
		expect(badVariant.status).toBe(400)
	})

	test('rate limits downloads per IP with Retry-After', async () => {
		mockFetch(() => 200)

		let response: Response | undefined
		for (let attempt = 0; attempt < 31; attempt += 1)
			response = await download(`id=${VIDEO_ID}&variant=default`, '10.9.9.10')

		expect(response?.status).toBe(429)
		expect(response?.headers.get('retry-after')).toBe('60')
		expect(response?.headers.get('content-type')).toBe('application/problem+json')
	})

	test('rejects a non-JPEG upstream response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(new Uint8Array([1, 2, 3]), {
						headers: { 'content-type': 'image/webp' },
					}),
			),
		)

		const response = await download(`id=${VIDEO_ID}&variant=default`, '10.0.1.5')
		expect(response.status).toBe(502)
		expect(response.headers.get('content-type')).toBe('application/problem+json')
	})
})
