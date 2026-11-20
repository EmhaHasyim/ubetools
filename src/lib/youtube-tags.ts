// Parses public YouTube watch/channel-page metadata. Pure module: no network, no Elysia.
import { parseVideoId } from './youtube.ts'

const META_TAGS = /<meta\b[^>]*>/gi
const KEYWORDS_NAME = /\bname\s*=\s*(["'])keywords\1/i
const META_CONTENT = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i
// YouTube returns 200 with generic keywords for unavailable videos, so check
// the embedded player state before trusting any metadata on the page.
const PLAYABILITY_STATUS = /"playabilityStatus"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/
const CHANNEL_MARKERS = ['channelMetadataRenderer', 'channelPlayerMetadataRenderer']
const YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
])
const HANDLE = /^@?[\w.-]{1,50}$/
const CHANNEL_ID = /^UC[\w-]{20,22}$/
const CHANNEL_SEGMENT = /^[\w.-]{1,50}$/

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	apos: "'",
	gt: '>',
	lt: '<',
	nbsp: ' ',
	quot: '"',
}

function decodeEntities(value: string) {
	return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code[0] !== '#') return NAMED_ENTITIES[code.toLowerCase()] ?? match

		const isHex = code[1]?.toLowerCase() === 'x'
		const point = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10)
		return Number.isFinite(point) && point > 0 && point <= 0x10ffff
			? String.fromCodePoint(point)
			: match
	})
}

export type WatchPageTagResult =
	| { state: 'ok'; tags: string[] }
	| { state: 'hidden'; tags: [] }
	| { state: 'unavailable'; tags: [] }
	| { state: 'blocked'; tags: [] }

/**
 * Validates a video or channel link and returns a canonical YouTube URL built
 * from validated parts only. Callers never fetch a user-supplied URL directly.
 */
export function parseYouTubeTarget(
	input: string,
): { kind: 'video' | 'channel'; url: string } | null {
	const value = input.trim()
	const videoId = parseVideoId(value)
	if (videoId) return { kind: 'video', url: `https://www.youtube.com/watch?v=${videoId}` }

	let url: URL
	try {
		url = new URL(value)
	} catch {
		return null
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
	if (!YOUTUBE_HOSTS.has(url.hostname)) return null

	const segments = url.pathname.split('/').filter(Boolean)
	if (segments.at(-1) === 'about') segments.pop()
	const [type, id] = segments
	let path: string
	if (segments.length === 1 && type && HANDLE.test(type) && type.startsWith('@'))
		path = `@${encodeURIComponent(type.slice(1))}`
	else if (segments.length === 2 && type === 'channel' && id && CHANNEL_ID.test(id))
		path = `channel/${encodeURIComponent(id)}`
	else if (
		segments.length === 2 &&
		(type === 'user' || type === 'c') &&
		id &&
		CHANNEL_SEGMENT.test(id)
	)
		path = `${type}/${encodeURIComponent(id)}`
	else return null

	return { kind: 'channel', url: `https://www.youtube.com/${path}` }
}

/**
 * Extracts the creator's tags from a public watch or channel page. `blocked`
 * means the response did not look like the expected YouTube page (consent wall,
 * proxy, etc.), so callers can tell it apart from a page with no tags.
 */
export function parseWatchPageTags(
	html: string,
	mode: 'video' | 'channel' = 'video',
): WatchPageTagResult {
	if (mode === 'channel') {
		if (!CHANNEL_MARKERS.some((marker) => html.includes(marker)))
			return { state: 'blocked', tags: [] }
	} else {
		const status = PLAYABILITY_STATUS.exec(html)?.[1]
		if (!status) return { state: 'blocked', tags: [] }
		if (status !== 'OK') return { state: 'unavailable', tags: [] }
	}

	let keywords: string | undefined
	for (const [tag] of html.matchAll(META_TAGS)) {
		if (!KEYWORDS_NAME.test(tag)) continue
		keywords = META_CONTENT.exec(tag)?.[2]
		break
	}
	if (!keywords) return { state: 'hidden', tags: [] }

	const seen = new Set<string>()
	const tags: string[] = []
	// Channel keywords are often space-separated; video keywords use commas.
	for (const part of decodeEntities(keywords)
		.slice(0, 20_000)
		.split(mode === 'channel' ? /[,\s]+/ : ',')) {
		const tag = part.trim()
		if (!tag || seen.has(tag)) continue
		seen.add(tag)
		tags.push(tag)
	}

	return tags.length ? { state: 'ok', tags } : { state: 'hidden', tags: [] }
}
