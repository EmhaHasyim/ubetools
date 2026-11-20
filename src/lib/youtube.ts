// YouTube link parsing and official thumbnail URLs. Pure module: no network, no Elysia.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'youtu.be',
])
const PATH_PREFIXES = new Set(['shorts', 'embed', 'live', 'v'])

// Order matters: highest resolution first, and the array is the variant allowlist.
export const thumbnailSizes = [
	{ variant: 'maxresdefault', label: 'HD Maksimal', width: 1280, height: 720 },
	{ variant: 'sddefault', label: 'SD', width: 640, height: 480 },
	{ variant: 'hqdefault', label: 'Tinggi', width: 480, height: 360 },
	{ variant: 'mqdefault', label: 'Sedang', width: 320, height: 180 },
	{ variant: 'default', label: 'Kecil', width: 120, height: 90 },
] as const

export type ThumbnailSize = (typeof thumbnailSizes)[number]
export type ThumbnailVariant = ThumbnailSize['variant']

export function isVideoId(value: string) {
	return VIDEO_ID.test(value)
}

/**
 * Extracts an 11-character video ID from a supported YouTube link (or a bare ID).
 * Returns null for any other host, protocol or malformed ID — callers never see a raw URL.
 */
export function parseVideoId(input: string): string | null {
	const value = input.trim()
	if (isVideoId(value)) return value

	let url: URL
	try {
		url = new URL(value)
	} catch {
		return null
	}

	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
	if (!YOUTUBE_HOSTS.has(url.hostname)) return null

	const segments = url.pathname.split('/').filter(Boolean)

	if (url.hostname === 'youtu.be') {
		const id = segments[0]
		return segments.length === 1 && id && isVideoId(id) ? id : null
	}

	if (segments[0] === 'watch') {
		const id = url.searchParams.get('v')
		return id && isVideoId(id) ? id : null
	}

	if (segments.length === 2 && PATH_PREFIXES.has(segments[0] ?? '')) {
		const id = segments[1]
		return id && isVideoId(id) ? id : null
	}

	return null
}

/**
 * Builds `https://i.ytimg.com/vi/<id>/<variant>.jpg` from validated parts only.
 * Throws on invalid input, so a user-supplied URL can never reach the network.
 */
export function thumbnailUrl(videoId: string, variant: ThumbnailVariant) {
	if (!isVideoId(videoId) || !thumbnailSizes.some((size) => size.variant === variant))
		throw new Error('Invalid YouTube thumbnail input')

	return `https://i.ytimg.com/vi/${videoId}/${variant}.jpg`
}
