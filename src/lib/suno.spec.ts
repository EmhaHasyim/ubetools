import { afterEach, describe, expect, test, vi } from 'vitest'
import {
	formatDuration,
	parseSunoMedia,
	parseSunoRequest,
	resolveSunoTargets,
	songFileName,
} from './suno.ts'

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
	test('parses a single public song link', async () => {
		expect(await parseSunoRequest(`https://suno.com/song/${SONG_A}`)).toEqual({
			mode: 'single',
			ids: [SONG_A],
		})
	})

	test('normalizes uppercase Suno hosts', async () => {
		expect(await parseSunoRequest(`HTTPS://SUNO.COM/song/${SONG_A}`)).toEqual({
			mode: 'single',
			ids: [SONG_A],
		})
	})

	test('parses multiple song links in order', async () => {
		expect(
			await parseSunoRequest(
				`https://www.suno.com/song/${SONG_A}?x=1\nhttps://suno.com/song/${SONG_B}`,
			),
		).toEqual({ mode: 'batch', ids: [SONG_A, SONG_B] })
	})

	test('parses a short share link as a single song', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					({
						status: 307,
						headers: { get: () => `/song/${SONG_A}?sh=abc123def` },
					}) as unknown as Response,
			),
		)
		expect(await parseSunoRequest('https://suno.com/s/abc123def')).toEqual({
			mode: 'single',
			ids: [SONG_A],
		})
	})

	test('parses a public playlist link', async () => {
		expect(await parseSunoRequest(`https://suno.com/playlist/${PLAYLIST}`)).toEqual({
			mode: 'playlist',
			ids: [PLAYLIST],
		})
	})

	test('rejects unsupported hosts, paths, UUIDs and mixed input', async () => {
		expect(await parseSunoRequest('http://suno.com/song/' + SONG_A)).toBeNull()
		expect(await parseSunoRequest('https://suno.com.evil.test/song/' + SONG_A)).toBeNull()
		expect(await parseSunoRequest('https://suno.com/s/not-a-share-code!')).toBeNull()
		expect(await parseSunoRequest('https://suno.com/song/not-a-uuid')).toBeNull()
		expect(
			await parseSunoRequest(
				`https://suno.com/playlist/${PLAYLIST}\nhttps://suno.com/song/${SONG_A}`,
			),
		).toBeNull()
		expect(
			await parseSunoRequest(
				`https://suno.com/playlist/${PLAYLIST}\nhttps://suno.com/playlist/${SONG_A}`,
			),
		).toBeNull()
		expect(
			await parseSunoRequest(
				Array.from({ length: 51 }, () => `https://suno.com/song/${SONG_A}`).join('\n'),
			),
		).toBeNull()
		expect(await parseSunoRequest('')).toBeNull()
	})
})

describe('parseSunoMedia', () => {
	test('accepts an unencoded public M4A entry', async () => {
		expect(await parseSunoMedia(response(clip()), SONG_A)).toEqual({
			url: 'https://cdn-o.suno.com/audio.m4a',
			id: SONG_A,
			encrypted: false,
		})
	})

	test('rejects wrong-type, wrong-host and failed responses', async () => {
		const bad = clip()
		bad.media_urls[0].content_type = 'mp3'
		expect(await parseSunoMedia(response(bad), SONG_A)).toBeNull()
		const evil = clip()
		evil.media_urls[0].url = 'https://evil.test/audio.m4a'
		expect(await parseSunoMedia(response(evil), SONG_A)).toBeNull()
		expect(await parseSunoMedia(response(clip(), false, 404), SONG_A)).toBeNull()
	})

	test('keeps the public clip details', async () => {
		const payload = {
			...clip(),
			title: 'Let the Silence Take Up Space',
			display_name: 'xorex859',
			major_model_version: 'v5',
			created_at: '2026-11-20T10:00:00.000Z',
			display_tags: 'alternative R&B, atmospheric, slow',
			metadata: { duration: 168.56 },
		}

		expect(await parseSunoMedia(response(payload), SONG_A)).toEqual({
			url: 'https://cdn-o.suno.com/audio.m4a',
			id: SONG_A,
			encrypted: false,
			title: 'Let the Silence Take Up Space',
			artist: 'xorex859',
			version: 'v5',
			createdAt: '2026-11-20T10:00:00.000Z',
			tags: ['alternative R&B', 'atmospheric', 'slow'],
			duration: 168.56,
		})
		expect(formatDuration(168.56)).toBe('2:49')
		expect(formatDuration(65)).toBe('1:05')
	})

	test('uses a sanitized song title with an m4a extension', () => {
		expect(songFileName('Let the Silence Take Up Space', 0)).toBe(
			'Let the Silence Take Up Space.m4a',
		)
		expect(songFileName('A/B: "C"', 1)).toBe('A B C.m4a')
		expect(songFileName('  ...  ', 2)).toBe('03.m4a')
		expect(songFileName(undefined, 7)).toBe('08.m4a')
	})

	test('accepts a percent-encoded CloudFront URL', async () => {
		const signed = clip()
		signed.media_urls[0].url =
			'https://d1example.cloudfront.net/clip/audio.m4a?Expires=1&Signature=abc%3D'
		expect(await parseSunoMedia(response(signed), SONG_A)).toEqual({
			url: 'https://d1example.cloudfront.net/clip/audio.m4a?Expires=1&Signature=abc%3D',
			id: SONG_A,
			encrypted: false,
		})
	})

	test('accepts a CloudFront M4A entry', async () => {
		const cloudfront = clip()
		cloudfront.media_urls[0].url = 'https://d1example.cloudfront.net/clip/audio.m4a'
		expect(await parseSunoMedia(response(cloudfront), SONG_A)).toEqual({
			url: 'https://d1example.cloudfront.net/clip/audio.m4a',
			id: SONG_A,
			encrypted: false,
		})
	})
})

describe('resolveSunoTargets', () => {
	test('reports how many playlist entries were skipped', async () => {
		const calls: string[] = []
		vi.stubGlobal('fetch', async (url: string) => {
			calls.push(url)
			return response({
				playlist_clips: [{ clip: { id: SONG_A, ...clip() } }, null],
			})
		})

		expect(await resolveSunoTargets({ mode: 'playlist', ids: [PLAYLIST] })).toEqual({
			targets: [{ url: 'https://cdn-o.suno.com/audio.m4a', id: SONG_A, encrypted: false }],
			skipped: 1,
		})
		expect(calls).toEqual([`https://studio-api.prod.suno.com/api/playlist/${PLAYLIST}/?page=1`])
	})

	test('returns playlist details alongside the tracks', async () => {
		vi.stubGlobal('fetch', async () =>
			response({
				name: 'Late Night',
				user_display_name: 'xorex859',
				song_count: 2,
				playlist_clips: [{ clip: { id: SONG_A, ...clip() } }],
			}),
		)

		expect(await resolveSunoTargets({ mode: 'playlist', ids: [PLAYLIST] })).toEqual({
			targets: [{ url: 'https://cdn-o.suno.com/audio.m4a', id: SONG_A, encrypted: false }],
			skipped: 0,
			playlist: { name: 'Late Night', owner: 'xorex859', songCount: 2 },
		})
	})

	test('fetches canonical clip API for a song', async () => {
		const calls: string[] = []
		vi.stubGlobal('fetch', async (url: string) => {
			calls.push(url)
			return response(clip())
		})

		expect(await resolveSunoTargets({ mode: 'single', ids: [SONG_A] })).toEqual({
			targets: [{ url: 'https://cdn-o.suno.com/audio.m4a', id: SONG_A, encrypted: false }],
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
