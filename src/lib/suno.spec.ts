import { afterEach, describe, expect, test, vi } from 'vitest'
import { parseSunoMedia, parseSunoRequest, resolveSunoTargets } from './suno.ts'

const SONG_A = '11111111-1111-4111-8111-111111111111'
const SONG_B = '22222222-2222-4222-8222-222222222222'
const PLAYLIST = '33333333-3333-4333-8333-333333333333'

function response(payload: unknown, ok = true, status = 200): Response {
	return {
		ok,
		status,
		json: async () => payload,
	} as Response
}

function clip(encoding?: string) {
	return {
		media_urls: [
			{
				url: 'https://cdn-o.suno.com/audio.m4a',
				content_type: 'm4a-opus',
				delivery: 'progressive',
				...(encoding ? { encoding } : {}),
			},
		],
	}
}

afterEach(() => vi.unstubAllGlobals())

describe('parseSunoRequest', () => {
	test('parses a single public song link', () => {
		expect(parseSunoRequest(`https://suno.com/song/${SONG_A}`)).toEqual({
			mode: 'single',
			ids: [SONG_A],
		})
	})

	test('normalizes uppercase Suno hosts', () => {
		expect(parseSunoRequest(`HTTPS://SUNO.COM/song/${SONG_A}`)).toEqual({
			mode: 'single',
			ids: [SONG_A],
		})
	})

	test('parses multiple song links in order', () => {
		expect(
			parseSunoRequest(`https://www.suno.com/song/${SONG_A}?x=1\nhttps://suno.com/song/${SONG_B}`),
		).toEqual({ mode: 'batch', ids: [SONG_A, SONG_B] })
	})

	test('parses a public playlist link', () => {
		expect(parseSunoRequest(`https://suno.com/playlist/${PLAYLIST}`)).toEqual({
			mode: 'playlist',
			ids: [PLAYLIST],
		})
	})

	test('rejects unsupported hosts, paths, UUIDs and mixed input', () => {
		expect(parseSunoRequest('http://suno.com/song/' + SONG_A)).toBeNull()
		expect(parseSunoRequest('https://suno.com.evil.test/song/' + SONG_A)).toBeNull()
		expect(parseSunoRequest('https://suno.com/s/' + SONG_A)).toBeNull()
		expect(parseSunoRequest('https://suno.com/song/not-a-uuid')).toBeNull()
		expect(
			parseSunoRequest(`https://suno.com/playlist/${PLAYLIST}\nhttps://suno.com/song/${SONG_A}`),
		).toBeNull()
		expect(
			parseSunoRequest(
				`https://suno.com/playlist/${PLAYLIST}\nhttps://suno.com/playlist/${SONG_A}`,
			),
		).toBeNull()
		expect(
			parseSunoRequest(
				Array.from({ length: 51 }, () => `https://suno.com/song/${SONG_A}`).join('\n'),
			),
		).toBeNull()
		expect(parseSunoRequest('')).toBeNull()
	})
})

describe('parseSunoMedia', () => {
	test('accepts an unencoded public M4A entry', async () => {
		expect(await parseSunoMedia(response(clip()))).toEqual({
			url: 'https://cdn-o.suno.com/audio.m4a',
		})
	})

	test('rejects encoded, wrong-type, wrong-host and failed responses', async () => {
		expect(await parseSunoMedia(response(clip('1.0.0')))).toBeNull()
		const bad = clip()
		bad.media_urls[0].content_type = 'mp3'
		expect(await parseSunoMedia(response(bad))).toBeNull()
		const evil = clip()
		evil.media_urls[0].url = 'https://evil.test/audio.m4a'
		expect(await parseSunoMedia(response(evil))).toBeNull()
		expect(await parseSunoMedia(response(clip(), false, 404))).toBeNull()
	})

	test('accepts a percent-encoded CloudFront URL', async () => {
		const signed = clip()
		signed.media_urls[0].url =
			'https://d1example.cloudfront.net/clip/audio.m4a?Expires=1&Signature=abc%3D'
		expect(await parseSunoMedia(response(signed))).toEqual({
			url: 'https://d1example.cloudfront.net/clip/audio.m4a?Expires=1&Signature=abc%3D',
		})
	})

	test('accepts a CloudFront M4A entry', async () => {
		const cloudfront = clip()
		cloudfront.media_urls[0].url = 'https://d1example.cloudfront.net/clip/audio.m4a'
		expect(await parseSunoMedia(response(cloudfront))).toEqual({
			url: 'https://d1example.cloudfront.net/clip/audio.m4a',
		})
	})
})

describe('resolveSunoTargets', () => {
	test('reports how many playlist entries were skipped', async () => {
		const calls: string[] = []
		vi.stubGlobal('fetch', async (url: string) => {
			calls.push(url)
			return response({
				playlist_clips: [{ clip: clip() }, { clip: clip('1.0.0') }],
			})
		})

		expect(await resolveSunoTargets({ mode: 'playlist', ids: [PLAYLIST] })).toEqual({
			targets: [{ url: 'https://cdn-o.suno.com/audio.m4a' }],
			skipped: 1,
		})
		expect(calls).toEqual([`https://studio-api.prod.suno.com/api/playlist/${PLAYLIST}/?page=1`])
	})

	test('fetches canonical clip API for a song', async () => {
		const calls: string[] = []
		vi.stubGlobal('fetch', async (url: string) => {
			calls.push(url)
			return response(clip())
		})

		expect(await resolveSunoTargets({ mode: 'single', ids: [SONG_A] })).toEqual({
			targets: [{ url: 'https://cdn-o.suno.com/audio.m4a' }],
			skipped: 0,
		})
		expect(calls).toEqual([`https://studio-api.prod.suno.com/api/clip/${SONG_A}`])
	})

	test('returns no targets when Suno is unreachable', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new Error('offline')
		})
		expect(await resolveSunoTargets({ mode: 'single', ids: [SONG_A] })).toEqual({
			targets: [],
			skipped: 1,
		})
	})

	test('rejects a playlist whose 32 clips are all encrypted', async () => {
		vi.stubGlobal('fetch', async () =>
			response({ playlist_clips: Array.from({ length: 32 }, () => ({ clip: clip('1.0.0') })) }),
		)
		expect(await resolveSunoTargets({ mode: 'playlist', ids: [PLAYLIST] })).toEqual({
			targets: [],
			skipped: 32,
		})
	})

	test('bounds a 50-song batch to five parallel requests', async () => {
		let active = 0
		let peak = 0
		vi.stubGlobal('fetch', async () => {
			active += 1
			peak = Math.max(peak, active)
			await new Promise((resolve) => setTimeout(resolve, 0))
			active -= 1
			return response(clip())
		})

		const ids = Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? SONG_A : SONG_B))
		const targets = await resolveSunoTargets({ mode: 'batch', ids })
		expect(targets.targets).toHaveLength(50)
		expect(peak).toBeGreaterThan(1)
		expect(peak).toBeLessThanOrEqual(5)
	})
})
