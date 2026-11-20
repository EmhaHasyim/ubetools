// Parses public Suno links and media metadata. Only builds upstream URLs from validated IDs.
export type SunoMode = 'single' | 'batch' | 'playlist'
export type SunoRequest = { mode: SunoMode; ids: string[] }
export type SunoMedia = { url: string }
export type SunoIdSet = { mode: SunoMode; ids: string[] }
export type SunoResolution = { targets: SunoMedia[]; skipped: number }

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUNO_HOSTS = new Set(['suno.com', 'www.suno.com'])
const API = 'https://studio-api.prod.suno.com/api'
const MAX_LINKS = 50

function parseLink(value: string): { kind: 'song' | 'playlist'; id: string } | null {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		return null
	}
	if (url.protocol !== 'https:' || !SUNO_HOSTS.has(url.hostname)) return null

	const segments = url.pathname.split('/').filter(Boolean)
	if (segments.length !== 2 || (segments[0] !== 'song' && segments[0] !== 'playlist')) return null
	const id = segments[1] ?? ''
	if (!ID.test(id)) return null
	return { kind: segments[0] as 'song' | 'playlist', id }
}

export function parseSunoRequest(input: string): SunoRequest | null {
	const links = input
		.split(/[\s,]+/)
		.filter(Boolean)
		.map(parseLink)
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
	return url.pathname.startsWith('/clip/') && url.pathname.endsWith('.m4a')
}

function mediaUrl(value: unknown): SunoMedia | null {
	return isAllowedMediaUrl(value) ? { url: value } : null
}

function mediaFromEntry(entry: unknown): SunoMedia | null {
	if (!entry || typeof entry !== 'object') return null
	const item = entry as Record<string, unknown>
	if (item.content_type !== 'm4a-opus' || item.delivery !== 'progressive') return null
	if (item.encoding !== undefined && item.encoding !== '') return null
	return mediaUrl(item.url)
}

export async function parseSunoMedia(response: Response): Promise<SunoMedia | null> {
	if (!response.ok) return null
	try {
		const data: unknown = await response.json()
		const urls = (data as { media_urls?: unknown })?.media_urls
		if (!Array.isArray(urls)) return null
		for (const entry of urls) {
			const media = mediaFromEntry(entry)
			if (media) return media
		}
		return null
	} catch {
		return null
	}
}

async function resolveOne(request: SunoRequest, id: string): Promise<SunoResolution> {
	const url = request.mode === 'playlist' ? `${API}/playlist/${id}/?page=1` : `${API}/clip/${id}`
	let response: Response
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
	} catch {
		return { targets: [], skipped: 1 }
	}
	if (request.mode !== 'playlist') {
		const media = await parseSunoMedia(response)
		return { targets: media ? [media] : [], skipped: media ? 0 : 1 }
	}

	let clips: unknown
	try {
		const data: unknown = await response.json()
		clips = (data as { playlist_clips?: unknown })?.playlist_clips
	} catch {
		return { targets: [], skipped: 1 }
	}
	if (!Array.isArray(clips)) return { targets: [], skipped: 1 }
	const targets: SunoMedia[] = []
	let skipped = 0
	for (const entry of clips) {
		if (targets.length >= MAX_LINKS) break
		const clip = (entry as { clip?: unknown })?.clip
		const media = await parseSunoMedia({ ok: response.ok, json: async () => clip } as Response)
		if (media) targets.push(media)
		else skipped += 1
	}
	return { targets, skipped }
}

export async function resolveSunoTargets(request: SunoIdSet): Promise<SunoResolution> {
	const targets: SunoMedia[] = []
	let skipped = 0
	// shortcut: five concurrent Suno probes cap a 50-link batch at ~80s; upgrade to
	// a queue with a total deadline if upstream latency needs a harder bound.
	for (let start = 0; start < request.ids.length; start += 5) {
		const batch = request.ids.slice(start, start + 5)
		const results = await Promise.all(batch.map((id) => resolveOne(request, id)))
		for (const result of results) {
			skipped += result.skipped
			for (const media of result.targets) {
				if (targets.length >= MAX_LINKS) return { targets, skipped }
				targets.push(media)
			}
		}
	}
	return { targets, skipped }
}
