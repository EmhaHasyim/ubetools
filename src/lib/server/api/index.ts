import { Elysia, t, type HTTPHeaders } from 'elysia'
import { openapi } from '@elysia/openapi'
import { zipSync } from 'fflate'
import pkg from '../../../../package.json' with { type: 'json' }
import { isVideoId, parseVideoId, thumbnailSizes, thumbnailUrl } from '#lib/youtube.ts'
import { parseWatchPageTags, parseYouTubeTarget } from '#lib/youtube-tags.ts'
import {
	formatDuration,
	parseSunoMedia,
	parseSunoRequest,
	resolveSunoTargets,
	songFileName,
} from '#lib/suno.ts'
import { fetchDecryptedSunoAudio } from '#lib/server/suno-rights.ts'
import { apiProblem } from '#lib/server/problem.ts'
import { clientIp, rateLimiter } from '#lib/server/rate-limit.ts'

function securityHeaders(headers: HTTPHeaders) {
	headers['X-Content-Type-Options'] = 'nosniff'
	headers['X-Frame-Options'] = 'DENY'
	headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
}

function checkQuota(request: Request, set: { headers: HTTPHeaders }) {
	const ip = clientIp(request)
	if (!ip)
		return apiProblem(
			400,
			'invalid-request',
			'Permintaan tidak valid',
			'Permintaan harus melalui Cloudflare.',
		)
	const quota = rateLimiter.check(ip)
	if (quota.allowed) return null

	set.headers['Retry-After'] = String(quota.retryAfter)
	return apiProblem(
		429,
		'rate-limited',
		'Terlalu banyak permintaan',
		`Coba lagi dalam ${quota.retryAfter} detik.`,
	)
}

const problemSchema = t.Object({
	type: t.String(),
	title: t.String(),
	status: t.Number(),
	detail: t.String(),
})

const thumbnailSchema = t.Object({
	variant: t.String(),
	label: t.String(),
	width: t.Number(),
	height: t.Number(),
	url: t.String(),
})

const sunoProblemDetail = 'Link Suno tidak valid. Tempel link lagu atau playlist Suno publik.'

function sunoInvalid() {
	return apiProblem(400, 'invalid-suno-url', 'Link tidak valid', sunoProblemDetail)
}

type SunoDownloadFile = { id: string; name: string; encrypted?: boolean }

type SunoDownloadToken = { files: SunoDownloadFile[]; zip: boolean }

const MAX_SUNO_BYTES = 200_000_000
const SUNO_TOTAL_MS = 60_000

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function decodeSunoToken(token: string): SunoDownloadToken | null {
	try {
		const data: unknown = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')))
		const files = (data as { files?: unknown })?.files
		if (!Array.isArray(files) || files.length === 0 || files.length > 50) return null
		if (
			!files.every(
				(file) =>
					typeof file?.id === 'string' &&
					typeof file?.name === 'string' &&
					(file?.encrypted === undefined || typeof file?.encrypted === 'boolean'),
			)
		)
			return null
		if (
			!files.every(
				(file) =>
					file.name.length > 4 &&
					file.name.length <= 84 &&
					file.name.endsWith('.m4a') &&
					/^[\p{L}\p{N} ._'-]+$/u.test(file.name.slice(0, -4)),
			)
		)
			return null
		if (new Set(files.map((file) => file.name)).size !== files.length) return null
		if (!files.every((file) => UUID_V4.test(file.id))) return null
		return { files, zip: (data as { zip?: unknown }).zip === true }
	} catch {
		return null
	}
}

const variantSchema = t.Union([
	t.Literal('maxresdefault'),
	t.Literal('sddefault'),
	t.Literal('hqdefault'),
	t.Literal('mqdefault'),
	t.Literal('default'),
])

// API mounted under /api by the SvelteKit boundary route. Add routes here.
export const app = new Elysia({ name: 'api', prefix: '/api', precompile: true })
	// Runs before body validation so malformed requests still use quota.
	.onTransform(({ request, set }) => {
		if (!request.url.includes('/api/tools/')) return
		const quotaError = checkQuota(request, set)
		if (quotaError) throw quotaError
	})
	.use(
		openapi({
			enabled: false,
			documentation: { info: { title: 'ubeTools API', version: pkg.version } },
		}),
	)
	// Request schema failures are client errors: keep them 400 with an Indonesian
	// detail instead of Elysia's English 422 dump.
	.onError(({ error, set }) => {
		securityHeaders(set.headers)
		if ((error as { status?: number } | null)?.status === 422)
			return apiProblem(
				400,
				'invalid-request',
				'Permintaan tidak valid',
				'Periksa link atau parameter yang dikirim, lalu coba lagi.',
			)
	})
	// Security headers for dynamic API responses — `_headers` only covers
	// static assets, so set them on the app itself.
	.onAfterHandle(({ set }) => securityHeaders(set.headers))
	.get(
		'/health',
		{
			detail: { summary: 'Health check' },
			response: t.Object({ status: t.Literal('ok'), version: t.String() }),
		},
		() => ({ status: 'ok' as const, version: pkg.version }),
	)
	.post(
		'/tools/youtube-thumbnail',
		{
			detail: { summary: 'Resolve available YouTube thumbnail sizes' },
			body: t.Object({ url: t.String({ minLength: 1, maxLength: 500 }) }),
			response: {
				200: t.Object({ videoId: t.String(), thumbnails: t.Array(thumbnailSchema) }),
				400: problemSchema,
				404: problemSchema,
				429: problemSchema,
				502: problemSchema,
			},
		},
		async ({ body }) => {
			const videoId = parseVideoId(body.url)
			if (!videoId)
				return apiProblem(
					400,
					'invalid-youtube-url',
					'Link tidak valid',
					'Tempel link video YouTube atau ID video 11 karakter, misalnya https://www.youtube.com/watch?v=...',
				)

			const probes = await Promise.allSettled(
				thumbnailSizes.map((size) =>
					fetch(thumbnailUrl(videoId, size.variant), {
						method: 'HEAD',
						signal: AbortSignal.timeout(5_000),
					}),
				),
			)

			let failed = 0
			const thumbnails = thumbnailSizes.flatMap((size, index) => {
				const probe = probes[index]
				if (!probe || probe.status === 'rejected') {
					failed += 1
					return []
				}
				if (!probe.value.ok) return []
				return [{ ...size, url: thumbnailUrl(videoId, size.variant) }]
			})

			if (thumbnails.length === 0) {
				return failed === thumbnailSizes.length
					? apiProblem(
							502,
							'upstream-unavailable',
							'Gagal mengambil thumbnail',
							'Server thumbnail YouTube tidak merespons. Coba lagi sebentar lagi.',
						)
					: apiProblem(
							404,
							'video-not-found',
							'Video tidak ditemukan',
							'Video mungkin privat, dihapus, atau tidak punya thumbnail publik.',
						)
			}

			return { videoId, thumbnails }
		},
	)
	.post(
		'/tools/youtube-tags',
		{
			detail: { summary: 'Extract tags from a public YouTube video or channel' },
			body: t.Object({ url: t.String({ minLength: 1, maxLength: 500 }) }),
			response: {
				200: t.Object({
					kind: t.Union([t.Literal('video'), t.Literal('channel')]),
					state: t.Union([t.Literal('ok'), t.Literal('hidden')]),
					tags: t.Array(t.String()),
				}),
				400: problemSchema,
				404: problemSchema,
				429: problemSchema,
				502: problemSchema,
			},
		},
		async ({ body }) => {
			const target = parseYouTubeTarget(body.url)
			if (!target)
				return apiProblem(
					400,
					'invalid-youtube-url',
					'Link tidak valid',
					'Tempel link video atau channel YouTube publik, misalnya https://www.youtube.com/@channel.',
				)

			let upstream: Response | null
			let html = ''
			try {
				upstream = await fetch(target.url, { signal: AbortSignal.timeout(8_000) })
				if (upstream?.ok) html = await upstream.text()
			} catch {
				upstream = null
			}
			if (!upstream)
				return apiProblem(
					502,
					'upstream-unavailable',
					'Gagal mengambil tag',
					'Server YouTube tidak merespons. Coba lagi sebentar lagi.',
				)
			if (!upstream.ok)
				return apiProblem(
					404,
					'content-not-found',
					'Video atau channel tidak ditemukan',
					'Konten mungkin privat, dihapus, atau alamatnya salah.',
				)

			const result = parseWatchPageTags(html, target.kind)
			if (result.state === 'blocked')
				return apiProblem(
					502,
					'upstream-unavailable',
					'Gagal mengambil tag',
					'YouTube tidak mengembalikan halaman yang dikenali. Coba lagi sebentar lagi.',
				)
			if (result.state === 'unavailable')
				return apiProblem(
					404,
					'video-not-found',
					'Video tidak ditemukan',
					'Video mungkin privat, dihapus, atau tidak tersedia.',
				)

			return { kind: target.kind, state: result.state, tags: result.tags }
		},
	)
	.post(
		'/tools/suno-music',
		{
			detail: { summary: 'Resolve public Suno audio into a download token' },
			body: t.Object({ input: t.String({ minLength: 1, maxLength: 5000 }) }),
			response: {
				200: t.Object({
					downloadUrl: t.String(),
					mode: t.Union([t.Literal('single'), t.Literal('batch'), t.Literal('playlist')]),
					tracks: t.Array(
						t.Object({
							id: t.String(),
							title: t.Optional(t.String()),
							artist: t.Optional(t.String()),
							duration: t.Optional(t.String()),
							version: t.Optional(t.String()),
							tags: t.Array(t.String()),
							createdAt: t.Optional(t.String()),
							coverUrl: t.Optional(t.String()),
							playCount: t.Optional(t.Number()),
						}),
					),
					totalDuration: t.Optional(t.String()),
					playlist: t.Optional(
						t.Object({
							name: t.Optional(t.String()),
							owner: t.Optional(t.String()),
							songCount: t.Optional(t.Number()),
						}),
					),
					skipped: t.Optional(t.Number()),
				}),
				400: problemSchema,
				429: problemSchema,
				502: problemSchema,
			},
		},
		async ({ body }) => {
			const parsed = await parseSunoRequest(body.input)
			if (!parsed) return sunoInvalid()

			const { targets, skipped, playlist } = await resolveSunoTargets(parsed)
			if (!targets.length)
				return apiProblem(
					502,
					'audio-unavailable',
					'Gagal mengambil audio',
					'Suno tidak menyediakan M4A publik untuk link ini. Coba link lain.',
				)

			const albumId = parsed.mode === 'playlist' ? parsed.ids[0]! : null
			const used = new Set<string>()
			const files: SunoDownloadFile[] = targets.map((target, index) => {
				let name = songFileName(target.title, index, false)
				if (used.has(name)) name = songFileName(target.title, index)
				used.add(name)
				return {
					id: target.id ?? albumId ?? parsed.ids[index]!,
					name,
					...(target.encrypted ? { encrypted: true } : {}),
				}
			})
			const token: SunoDownloadToken = { files, zip: parsed.mode !== 'single' }
			const encodedToken = btoa(JSON.stringify(token))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '')
			if (encodedToken.length > 32000)
				return apiProblem(
					502,
					'audio-unavailable',
					'Gagal menyiapkan unduhan',
					'Link audio terlalu panjang. Coba lebih sedikit lagu.',
				)
			const tracks = targets.map((target) => ({
				id: target.id,
				...(target.title ? { title: target.title } : {}),
				...(target.artist ? { artist: target.artist } : {}),
				...(target.duration !== undefined ? { duration: formatDuration(target.duration) } : {}),
				...(target.version ? { version: target.version } : {}),
				...(target.createdAt ? { createdAt: target.createdAt } : {}),
				...(target.coverUrl ? { coverUrl: target.coverUrl } : {}),
				...(target.playCount !== undefined ? { playCount: target.playCount } : {}),
				tags: target.tags ?? [],
			}))
			const total = targets.reduce((sum, item) => sum + (item.duration ?? 0), 0)
			const downloadUrl = `/api/tools/suno-music/download?token=${encodedToken}`
			return {
				downloadUrl,
				mode: parsed.mode,
				tracks,
				...(total ? { totalDuration: formatDuration(total) } : {}),
				...(playlist ? { playlist } : {}),
				...(skipped ? { skipped } : {}),
			}
		},
	)
	.get(
		'/tools/suno-music/download',
		{
			detail: { summary: 'Download public Suno audio as a file or ZIP' },
			query: t.Object({ token: t.String({ minLength: 1, maxLength: 32000 }) }),
			response: { 400: problemSchema, 429: problemSchema, 502: problemSchema },
		},
		async ({ query }) => {
			const token = decodeSunoToken(query.token)
			if (!token) return sunoInvalid()

			const deadline = Date.now() + SUNO_TOTAL_MS
			const chunks: Record<string, Uint8Array> = {}
			let total = 0
			for (const file of token.files) {
				const remaining = deadline - Date.now()
				if (remaining <= 0 || total >= MAX_SUNO_BYTES) break
				let bytes: Uint8Array | null
				try {
					const media = await fetch(`https://studio-api.prod.suno.com/api/clip/${file.id}`, {
						signal: AbortSignal.timeout(Math.min(8_000, remaining)),
					})
					const fresh = await parseSunoMedia(media, file.id)
					if (!fresh) continue
					if (fresh.encrypted !== (file.encrypted ?? false)) continue
					bytes = await fetchDecryptedSunoAudio(
						fresh,
						AbortSignal.timeout(Math.max(1, Math.min(30_000, deadline - Date.now()))),
					)
					if (!bytes || bytes.byteLength > Math.min(25_000_000, MAX_SUNO_BYTES - total)) continue
				} catch {
					continue
				}
				total += bytes.byteLength
				chunks[file.name] = bytes
			}
			if (!Object.keys(chunks).length)
				return apiProblem(
					502,
					'audio-unavailable',
					'Gagal mengunduh audio',
					'Suno tidak mengirim M4A publik. Coba lagi sebentar lagi.',
				)

			if (!token.zip) {
				const first = Object.entries(chunks)[0]!
				return new Response(new Uint8Array(first[1]).buffer, {
					headers: {
						'Content-Type': 'audio/mp4',
						'Content-Disposition': `attachment; filename="${first[0]}"`,
						'X-Content-Type-Options': 'nosniff',
						'Cache-Control': 'no-store',
					},
				})
			}

			// shortcut: at most 200 MB of ZIP audio is buffered in memory; upgrade to a
			// streaming ZIP writer if the total limit must rise.
			const zip = zipSync(chunks, { level: 0 })
			return new Response(zip, {
				headers: {
					'Content-Type': 'application/zip',
					'Content-Disposition': 'attachment; filename="suno-music.zip"',
					'X-Content-Type-Options': 'nosniff',
					'Cache-Control': 'no-store',
				},
			})
		},
	)
	.get(
		'/tools/youtube-thumbnail/download',
		{
			detail: { summary: 'Download a YouTube thumbnail as an attachment' },
			query: t.Object({ id: t.String(), variant: variantSchema }),
		},
		async ({ query }) => {
			const videoId = isVideoId(query.id) ? query.id : null
			if (!videoId)
				return apiProblem(
					400,
					'invalid-video-id',
					'ID video tidak valid',
					'ID video YouTube harus tepat 11 karakter.',
				)

			const upstream = await fetch(thumbnailUrl(videoId, query.variant), {
				signal: AbortSignal.timeout(8_000),
			}).catch(() => null)

			if (!upstream)
				return apiProblem(
					502,
					'upstream-unavailable',
					'Gagal mengunduh thumbnail',
					'Server thumbnail YouTube tidak merespons. Coba lagi sebentar lagi.',
				)
			if (upstream.status === 404)
				return apiProblem(
					404,
					'thumbnail-not-found',
					'Thumbnail tidak ditemukan',
					'Ukuran thumbnail ini tidak tersedia untuk video tersebut.',
				)
			const contentType = upstream.headers.get('content-type')?.split(';')[0]?.trim()
			if (!upstream.ok || !upstream.body || contentType !== 'image/jpeg')
				return apiProblem(
					502,
					'upstream-unavailable',
					'Gagal mengunduh thumbnail',
					'Server thumbnail YouTube tidak mengirim gambar JPEG. Coba lagi sebentar lagi.',
				)

			return new Response(upstream.body, {
				headers: {
					'Content-Type': 'image/jpeg',
					'Content-Disposition': `attachment; filename="ubetools-${videoId}-${query.variant}.jpg"`,
					'X-Content-Type-Options': 'nosniff',
					'Cache-Control': 'private, max-age=3600',
				},
			})
		},
	)

export type App = typeof app

export default app
