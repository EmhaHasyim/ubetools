import { afterEach, describe, expect, test, vi } from 'vitest'
import { app } from './index.ts'
import { withCf } from './test-helpers.ts'

const SONG_A = '11111111-1111-4111-8111-111111111111'
const SONG_B = '22222222-2222-4222-8222-222222222222'
const PLAYLIST = '33333333-3333-4333-8333-333333333333'
const AUDIO = 'https://cdn-o.suno.com/audio.m4a'

function response(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}

function audioResponse(bytes: Uint8Array, headers: Record<string, string> = {}): Response {
	return new Response(new Uint8Array(bytes), {
		status: 200,
		headers: new Headers({ 'Content-Type': 'audio/mp4', ...headers }),
	})
}

function clip(encoding?: string, title = 'Let the Silence Take Up Space') {
	return {
		title,
		media_urls: [
			{
				url: AUDIO,
				content_type: 'm4a-opus',
				delivery: 'progressive',
				...(encoding ? { encoding } : {}),
			},
		],
	}
}

function token(files: unknown[], zip: boolean) {
	return Buffer.from(
		JSON.stringify({
			files: files.map((file) => ({
				...(file as object),
				id: SONG_A,
				encrypted: (file as { encrypted?: boolean }).encrypted ?? false,
			})),
			zip,
		}),
	).toString('base64url')
}

function post(input: string) {
	return app.handle(
		withCf(
			new Request('http://localhost/api/tools/suno-music', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input }),
			}),
		),
	)
}

function get(query: string) {
	return app.handle(withCf(new Request(`http://localhost/api/tools/suno-music/download?${query}`)))
}

afterEach(() => vi.unstubAllGlobals())

describe('POST /api/tools/suno-music', () => {
	test('rejects an invalid Suno link', async () => {
		const result = await post('https://evil.test/song/nope')
		expect(result.status).toBe(400)
		expect(((await result.json()) as { detail: string }).detail).toContain('Link Suno tidak valid')
	})

	test('resolves one song to a single-file download URL', async () => {
		vi.stubGlobal('fetch', async () => response(clip()))
		const result = await post(`https://suno.com/song/${SONG_A}`)
		expect(result.status).toBe(200)
		const data = (await result.json()) as Record<string, unknown>
		expect(data.mode).toBe('single')
		expect(data.downloadUrl).toMatch(/^\/api\/tools\/suno-music\/download\?token=/)
		expect(data).not.toHaveProperty('filename')
	})

	test('zips every public M4A file from a batch, including encrypted ones', async () => {
		let call = 0
		vi.stubGlobal('fetch', async () =>
			response(
				clip(
					call++ === 0 ? undefined : '1.0.0',
					call === 2 ? 'Neon Rain' : 'Let the Silence Take Up Space',
				),
			),
		)
		const result = await post(`https://suno.com/song/${SONG_A}\nhttps://suno.com/song/${SONG_B}`)
		expect(result.status).toBe(200)
		const data = (await result.json()) as Record<string, unknown>
		expect(data.mode).toBe('batch')
		const tokenQuery = String(data.downloadUrl).split('token=')[1]!
		expect(atob(tokenQuery)).toContain('Let the Silence Take Up Space 1.m4a')
		expect(atob(tokenQuery)).toContain('Neon Rain 2.m4a')
		expect(atob(tokenQuery)).toContain('"encrypted":true')
	})

	test('rejects duplicate output names in a download token', async () => {
		const duplicate = Buffer.from(
			JSON.stringify({
				files: [
					{ id: SONG_A, name: '01.m4a', encrypted: false },
					{ id: SONG_B, name: '01.m4a', encrypted: false },
				],
				zip: true,
			}),
		).toString('base64url')
		const result = await get(`token=${duplicate}`)
		expect(result.status).toBe(400)
	})

	test('uses the playlist ID for every clip in a playlist download token', async () => {
		vi.stubGlobal('fetch', async () =>
			response({
				playlist_clips: [
					{ clip: { ...clip(), id: SONG_A } },
					{ clip: { ...clip(undefined, 'Neon Rain'), id: SONG_B } },
				],
			}),
		)
		const result = await post(`https://suno.com/playlist/${PLAYLIST}`)
		expect(result.status).toBe(200)
		const data = (await result.json()) as { downloadUrl: string }
		const saved = JSON.parse(atob(data.downloadUrl.split('token=')[1]!)) as {
			files: { id: string; name: string; encrypted?: boolean }[]
		}
		expect(saved.files.map((file) => file.id)).toEqual([SONG_A, SONG_B])
		expect(saved.files.map((file) => file.name)).toEqual([
			'Let the Silence Take Up Space 1.m4a',
			'Neon Rain 2.m4a',
		])
	})

	test('resolves encrypted audio without skipping it', async () => {
		vi.stubGlobal('fetch', async () => response(clip('1.0.0')))
		const result = await post(`https://suno.com/song/${SONG_A}\nhttps://suno.com/song/${SONG_B}`)
		expect(result.status).toBe(200)
		await expect(result.json()).resolves.not.toHaveProperty('skipped')
	})
})

describe('GET /api/tools/suno-music/download', () => {
	test('streams an audio attachment for a single file', async () => {
		const bytes = new Uint8Array([1, 2, 3])
		vi.stubGlobal('fetch', async (input: string) =>
			input.includes('/api/clip/') ? response(clip()) : audioResponse(bytes),
		)
		const result = await get(`token=${token([{ url: AUDIO, name: '01.m4a' }], false)}`)
		expect(result.status).toBe(200)
		expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes)
		expect(result.headers.get('content-type')).toContain('audio/mp4')
		expect(result.headers.get('content-disposition')).toContain('attachment')
		expect(result.headers.get('cache-control')).toBe('no-store')
	})

	test('accepts a token with 50 clip IDs', async () => {
		vi.stubGlobal('fetch', async (input: string) =>
			input.includes('/api/clip/') ? response(clip()) : audioResponse(new Uint8Array([1])),
		)
		const files = Array.from({ length: 50 }, (_, i) => ({
			name: `${String(i + 1).padStart(2, '0')}.m4a`,
		}))
		const result = await get(`token=${token(files, true)}`)
		expect(result.status).toBe(200)
	})

	test('accepts M4A bytes served as video/mp4', async () => {
		const bytes = new Uint8Array([1, 2, 3])
		vi.stubGlobal('fetch', async (input: string) =>
			input.includes('/api/clip/')
				? response(clip())
				: new Response(new Uint8Array(bytes), {
						status: 200,
						headers: { 'Content-Type': 'video/mp4' },
					}),
		)
		const result = await get(`token=${token([{ name: '01.m4a' }], false)}`)
		expect(result.status).toBe(200)
		expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes)
	})

	test('rejects an allowlisted host that returns non-audio bytes', async () => {
		vi.stubGlobal(
			'fetch',
			async () =>
				new Response('<html>not audio</html>', {
					status: 200,
					headers: { 'Content-Type': 'text/html' },
				}),
		)
		const result = await get(`token=${token([{ url: AUDIO, name: '01.m4a' }], false)}`)
		expect(result.status).toBe(502)
	})

	test('resolves a fresh media URL when downloading from a clip ID', async () => {
		let clipCalls = 0
		vi.stubGlobal('fetch', async (input: string) => {
			if (input.includes('/api/clip/')) {
				clipCalls += 1
				clip().media_urls[0].url = `https://cdn-o.suno.com/fresh${clipCalls}.m4a`
				return response(clip())
			}
			return audioResponse(new Uint8Array([1, 2, 3]))
		})
		const result = await get(`token=${token([{ name: '01.m4a' }], false)}`)
		expect(result.status).toBe(200)
		expect(clipCalls).toBe(1)
	})

	test('maps a broken upstream body to a friendly 502', async () => {
		vi.stubGlobal('fetch', async (input: string) => {
			if (input.includes('/api/clip/')) return response(clip())
			const upstream = new Response(null, { status: 200 })
			vi.spyOn(upstream, 'arrayBuffer').mockRejectedValue(new Error('stream broke'))
			return upstream
		})
		const result = await get(`token=${token([{ url: AUDIO, name: '01.m4a' }], false)}`)
		expect(result.status).toBe(502)
		expect(((await result.json()) as { detail: string }).detail).not.toContain('stream broke')
	})

	test('rejects an oversized audio response before buffering it', async () => {
		vi.stubGlobal('fetch', async (input: string) =>
			input.includes('/api/clip/')
				? response(clip())
				: audioResponse(new Uint8Array([1]), { 'Content-Length': '100000000' }),
		)
		const result = await get(`token=${token([{ name: '01.m4a' }], false)}`)
		expect(result.status).toBe(502)
	})

	test('skips a clip whose fresh media URL is no longer public', async () => {
		vi.stubGlobal('fetch', async (input: string) => {
			if (!input.includes('/api/clip/')) return audioResponse(new Uint8Array([9]))
			return response(clip())
		})
		const result = await get(`token=${token([{ name: '01.m4a', encrypted: true }], false)}`)
		expect(result.status).toBe(502)
	})

	test('stops a ZIP download after the total size limit', async () => {
		vi.stubGlobal('fetch', async (input: string) => {
			if (input.includes('/api/clip/')) return response(clip())
			return audioResponse(new Uint8Array([1]), { 'Content-Length': '100000000' })
		})
		const files = Array.from({ length: 50 }, (_, i) => ({
			name: `${String(i + 1).padStart(2, '0')}.m4a`,
		}))
		const result = await get(`token=${token(files, true)}`)
		expect(result.status).toBe(502)
	})

	test('reports how many batch clips were skipped', async () => {
		let call = 0
		vi.stubGlobal('fetch', async () => {
			if (call++ === 0) return response(clip())
			return response({ media_urls: [] })
		})
		const result = await post(`https://suno.com/song/${SONG_A}\nhttps://suno.com/song/${SONG_B}`)
		expect(result.status).toBe(200)
		expect((await result.json()) as Record<string, unknown>).toMatchObject({ skipped: 1 })
	})

	test('rejects a token with a non-Suno clip ID without fetching', async () => {
		const fetchMock = vi.fn<() => Promise<Response>>()
		vi.stubGlobal('fetch', fetchMock)
		const result = await get(
			`token=${Buffer.from(
				JSON.stringify({ files: [{ id: 'evil.test', name: '01.m4a' }], zip: false }),
			).toString('base64url')}`,
		)
		expect(result.status).toBe(400)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	test('packages multiple files into a valid ZIP', async () => {
		vi.stubGlobal('fetch', async (input: string) =>
			input.includes('/api/clip/') ? response(clip()) : audioResponse(new Uint8Array([4, 5, 6])),
		)
		const result = await get(
			`token=${token(
				[
					{ url: AUDIO, name: '01.m4a' },
					{ url: AUDIO, name: '02.m4a' },
				],
				true,
			)}`,
		)
		expect(result.status).toBe(200)
		expect(result.headers.get('content-type')).toContain('application/zip')
		expect(result.headers.get('cache-control')).toBe('no-store')
		const bytes = new Uint8Array(await result.arrayBuffer())
		expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('PK\x03\x04')
		expect(new TextDecoder().decode(bytes)).toContain('01.m4a')
		expect(new TextDecoder().decode(bytes)).toContain('02.m4a')
	})

	test('rejects a missing token', async () => {
		expect((await get('')).status).toBe(400)
	})
})
