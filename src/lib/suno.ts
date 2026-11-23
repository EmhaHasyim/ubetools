// Parses public Suno links and media metadata. Only builds upstream URLs from validated IDs.
export type SunoMode = 'single' | 'batch' | 'playlist'
export type SunoRequest = { mode: SunoMode; ids: string[] }
export type SunoMedia = {
	url: string
	id: string
	encrypted: boolean
	title?: string
	artist?: string
	duration?: number
	version?: string
	tags?: string[]
	createdAt?: string
}
export type SunoPlaylist = { name?: string; owner?: string; songCount?: number }
export type SunoIdSet = { mode: SunoMode; ids: string[] }
export type SunoResolution = {
	targets: SunoMedia[]
	skipped: number
	playlist?: SunoPlaylist
}

export function formatDuration(seconds: number): string {
	const value = Math.max(0, Math.round(seconds))
	return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

export function songFileName(title: string | undefined, index: number): string {
	const cleaned = title
		?.replace(/[\\/:*?"<>|]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80)
	const base = cleaned && /[a-z0-9]/i.test(cleaned) ? cleaned : ''
	return `${base || String(index + 1).padStart(2, '0')}.m4a`
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUNO_HOSTS = new Set(['suno.com', 'www.suno.com'])
const API = 'https://studio-api.prod.suno.com/api'
const MAX_LINKS = 50
const SHARE_CODE = /^[A-Za-z0-9]{8,24}$/

async function parseLink(value: string): Promise<{ kind: 'song' | 'playlist'; id: string } | null> {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		return null
	}
	if (url.protocol !== 'https:' || !SUNO_HOSTS.has(url.hostname)) return null

	const segments = url.pathname.split('/').filter(Boolean)
	if (segments.length !== 2) return null
	const id = segments[1] ?? ''
	if ((segments[0] === 's' || segments[0] === 'share') && SHARE_CODE.test(id)) {
		try {
			const response = await fetch(`https://suno.com/s/${id}`, {
				redirect: 'manual',
				signal: AbortSignal.timeout(8_000),
			})
			const location = response.headers.get('location')
			if (!location) return null
			const resolved =
				new URL(location, 'https://suno.com').pathname.split('/').filter(Boolean)[1] ?? ''
			return ID.test(resolved) ? { kind: 'song', id: resolved } : null
		} catch {
			return null
		}
	}
	if (segments[0] !== 'song' && segments[0] !== 'playlist') return null
	if (!ID.test(id)) return null
	return { kind: segments[0] as 'song' | 'playlist', id }
}

export async function parseSunoRequest(input: string): Promise<SunoRequest | null> {
	const links = await Promise.all(
		input
			.split(/[\s,]+/)
			.filter(Boolean)
			.map(parseLink),
	)
	if (!links.length || links.length > MAX_LINKS || links.some((link) => !link)) return null

	const songs = links.filter((link) => link?.kind === 'song').map((link) => link!.id)
	const playlists = links.filter((link) => link?.kind === 'playlist').map((link) => link!.id)
	if (playlists.length === 1 && songs.length === 0) return { mode: 'playlist', ids: playlists }
	if (playlists.length === 0 && songs.length === 1) return { mode: 'single', ids: songs }
	if (playlists.length === 0 && songs.length > 1) return { mode: 'batch', ids: songs }
	return null
}

export function isAllowedMediaUrl(value: unknown): value is string {
	let url: URL
	try {
		if (typeof value !== 'string' || /[^ -~]/.test(value)) return false
		url = new URL(value)
	} catch {
		return false
	}
	if (url.protocol !== 'https:' || value !== url.href) return false
	if (url.hostname === 'cdn-o.suno.com') return url.pathname.endsWith('.m4a')
	if (!url.hostname.endsWith('.cloudfront.net')) return false
	return url.pathname.includes('/clip/') && url.pathname.endsWith('.m4a')
}

function text(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function trackInfo(data: unknown): Partial<SunoMedia> {
	if (!data || typeof data !== 'object') return {}
	const clip = data as Record<string, unknown>
	const meta =
		clip.metadata && typeof clip.metadata === 'object'
			? (clip.metadata as Record<string, unknown>)
			: {}
	const info: Partial<SunoMedia> = {}
	const title = text(clip.title)
	const artist = text(clip.display_name)
	const version = text(clip.major_model_version)
	const createdAt = text(clip.created_at)
	const tags = text(clip.display_tags)
		?.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
		.slice(0, 3)
	if (title) info.title = title
	if (artist) info.artist = artist
	if (version) info.version = version
	if (createdAt) info.createdAt = createdAt
	if (typeof meta.duration === 'number' && Number.isFinite(meta.duration))
		info.duration = meta.duration
	if (tags?.length) info.tags = tags
	return info
}

function playlistInfo(data: unknown): SunoPlaylist | undefined {
	if (!data || typeof data !== 'object') return undefined
	const item = data as Record<string, unknown>
	const info: SunoPlaylist = {}
	const name = text(item.name)
	const owner = text(item.user_display_name)
	const count =
		typeof item.song_count === 'number'
			? item.song_count
			: typeof item.num_total_results === 'number'
				? item.num_total_results
				: undefined
	if (name) info.name = name
	if (owner) info.owner = owner
	if (count !== undefined) info.songCount = count
	return Object.keys(info).length ? info : undefined
}

function mediaFromEntry(entry: unknown, id: string, info: Partial<SunoMedia>): SunoMedia | null {
	if (!entry || typeof entry !== 'object') return null
	const item = entry as Record<string, unknown>
	if (item.content_type !== 'm4a-opus' || item.delivery !== 'progressive') return null
	if (!isAllowedMediaUrl(item.url)) return null
	return { url: item.url, id, encrypted: !!item.encoding, ...info }
}

function parseSunoClip(data: unknown, id: string): SunoMedia | null {
	const urls =
		data && typeof data === 'object' ? (data as { media_urls?: unknown }).media_urls : undefined
	if (!Array.isArray(urls)) return null
	const info = trackInfo(data)
	for (const entry of urls) {
		const media = mediaFromEntry(entry, id, info)
		if (media) return media
	}
	return null
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json()
	} catch {
		return null
	}
}

export async function parseSunoMedia(response: Response, id: string): Promise<SunoMedia | null> {
	if (!response.ok) return null
	return parseSunoClip(await readJson(response), id)
}

async function resolveOne(request: SunoRequest, id: string): Promise<SunoResolution> {
	const url = request.mode === 'playlist' ? `${API}/playlist/${id}/?page=1` : `${API}/clip/${id}`
	let response: Response
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
	} catch {
		return { targets: [], skipped: 1 }
	}
	const data = await readJson(response)
	if (!response.ok) return { targets: [], skipped: 1 }
	if (request.mode !== 'playlist') {
		const media = parseSunoClip(data, id)
		return { targets: media ? [media] : [], skipped: media ? 0 : 1 }
	}

	const clips =
		data && typeof data === 'object'
			? (data as { playlist_clips?: unknown }).playlist_clips
			: undefined
	if (!Array.isArray(clips)) return { targets: [], skipped: 1 }
	const targets: SunoMedia[] = []
	let skipped = 0
	for (const entry of clips) {
		if (targets.length >= MAX_LINKS) break
		const clip = (entry as { clip?: { id?: string } })?.clip
		const media = parseSunoClip(clip, clip?.id ?? '')
		if (media) targets.push(media)
		else skipped += 1
	}
	const playlist = playlistInfo(data)
	return { targets, skipped, ...(playlist ? { playlist } : {}) }
}

export async function resolveSunoTargets(request: SunoIdSet): Promise<SunoResolution> {
	const targets: SunoMedia[] = []
	let skipped = 0
	let playlist: SunoPlaylist | undefined
	// shortcut: five concurrent Suno probes cap a 50-link batch at ~80s; upgrade to
	// a queue with a total deadline if upstream latency needs a harder bound.
	for (let start = 0; start < request.ids.length; start += 5) {
		const batch = request.ids.slice(start, start + 5)
		const results = await Promise.all(batch.map((id) => resolveOne(request, id)))
		for (const result of results) {
			skipped += result.skipped
			if (result.playlist) playlist = result.playlist
			for (const media of result.targets) {
				if (targets.length >= MAX_LINKS)
					return { targets, skipped, ...(playlist ? { playlist } : {}) }
				targets.push(media)
			}
		}
	}
	return { targets, skipped, ...(playlist ? { playlist } : {}) }
}
