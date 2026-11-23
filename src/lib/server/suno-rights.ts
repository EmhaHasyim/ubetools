import { deriveSunoMediaKey, decryptSunoAudio } from '#lib/suno-crypto.ts'

type Rights = { key: string; iv: string; glt: string }

async function browserToken() {
	const token = btoa(JSON.stringify({ timestamp: Date.now() }))
	return token.replace(/\+/g, '%2B').replace(/\//g, '%2F').replace(/=+$/, '')
}

export async function fetchDecryptedSunoAudio(
	media: { url: string; id: string; encrypted: boolean },
	signal: AbortSignal,
): Promise<Uint8Array | null> {
	const upstream = await fetch(media.url, { signal })
	const contentType = upstream.headers.get('content-type')?.split(';')[0]?.trim()
	const contentLength = upstream.headers.get('content-length')
	const length = contentLength ? Number(contentLength) : 0
	if (
		!upstream.ok ||
		!upstream.body ||
		(contentLength && (!Number.isFinite(length) || length > 25_000_000)) ||
		(contentType !== 'application/octet-stream' &&
			contentType !== 'video/mp4' &&
			!contentType?.startsWith('audio/'))
	)
		return null
	const bytes = new Uint8Array(await upstream.arrayBuffer())
	if (!media.encrypted) return bytes

	const response = await fetch('https://suno.com/a/api/mango/rights', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			origin: 'https://suno.com',
			referer: 'https://suno.com/',
			'Browser-Token': await browserToken(),
		},
		body: JSON.stringify({
			content_params: { content_id: media.id, content_type: 'clip' },
		}),
		signal,
	})
	if (!response.ok) return null
	const rights = (await response.json()) as Rights
	const { key, iv } = await deriveSunoMediaKey(rights, media.id)
	return decryptSunoAudio(bytes, key, iv)
}
