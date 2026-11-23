import { describe, expect, test, vi } from 'vitest'
import { app } from './index.ts'
import { withCf } from './test-helpers.ts'

const SONG = '11111111-1111-4111-8111-111111111111'
const AUDIO = 'https://cdn-o.suno.com/audio.m4a'

function response(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}

async function download(input: string, title = 'Stay Where You Are', zip = false) {
	vi.stubGlobal('fetch', async (target: string | URL | Request) => {
		const url = String(target)
		if (url.includes('mango/rights')) return response({ key: 'key', iv: 'iv' })
		if (url.startsWith(AUDIO))
			return new Response(new Uint8Array([0, 1, 2, 3]), {
				status: 200,
				headers: { 'Content-Type': 'audio/mp4' },
			})
		const clip = (name: string) => ({
			title: name,
			media_urls: [{ url: AUDIO, content_type: 'm4a-opus', delivery: 'progressive' }],
		})
		return response(
			url.includes('/playlist/')
				? {
						playlist_clips: [
							{ clip: { ...clip(title), id: SONG } },
							{
								clip: {
									...clip(`${title} 2`),
									id: '22222222-2222-4222-8222-222222222222',
								},
							},
						],
					}
				: clip(title),
		)
	})
	if (zip) input = `https://suno.com/playlist/33333333-3333-4333-8333-333333333333`
	const created = await app.handle(
		withCf(
			new Request('http://localhost/api/tools/suno-music', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input }),
			}),
		),
	)
	if (created.status !== 200)
		throw new Error(`create failed: ${created.status} ${await created.text()}`)
	const data = (await created.json()) as { downloadUrl: string }
	return app.handle(withCf(new Request(`http://localhost${data.downloadUrl}`)))
}

describe('Suno download filename', () => {
	test('serves the song title as a .m4a attachment', async () => {
		const result = await download(`https://suno.com/song/${SONG}`)
		expect(result.status).toBe(200)
		expect(result.headers.get('content-type')).toBe('audio/mp4')
		expect(result.headers.get('content-disposition')).toBe(
			'attachment; filename="Stay Where You Are 1.m4a"',
		)
	})

	test('keeps a generic ZIP name for batch downloads', async () => {
		const result = await download(`https://suno.com/song/${SONG}`, 'Track A', true)
		expect(result.status).toBe(200)
		expect(result.headers.get('content-type')).toBe('application/zip')
		expect(result.headers.get('content-disposition')).toBe('attachment; filename="suno-music.zip"')
	})

	test('serves Unicode titles as ASCII filenames', async () => {
		const result = await download(`https://suno.com/song/${SONG}`, 'A😀')
		expect(result.status).toBe(200)
		expect(result.headers.get('content-disposition')).toBe('attachment; filename="A 1.m4a"')
	})

	test('falls back to a numbered filename when the title is missing', async () => {
		const result = await download(`https://suno.com/song/${SONG}`, '', false)
		expect(result.status).toBe(200)
		expect(result.headers.get('content-disposition')).toBe('attachment; filename="01.m4a"')
	})
})
