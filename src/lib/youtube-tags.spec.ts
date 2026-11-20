import { describe, expect, test } from 'vitest'
import { parseWatchPageTags, parseYouTubeTarget } from './youtube-tags.ts'

function watchPage(keywords: string | null, status = 'OK') {
	const meta = keywords === null ? '' : `<meta name="keywords" content="${keywords}">`
	return `<html><head>${meta}<script>var ytInitialPlayerResponse = {"playabilityStatus":{"status":"${status}"}};</script></head></html>`
}

describe('parseWatchPageTags', () => {
	test('splits, trims and deduplicates creator tags', () => {
		const result = parseWatchPageTags(
			watchPage('rick astley, Never Gonna Give You Up, rick astley, ,'),
		)
		expect(result).toEqual({ state: 'ok', tags: ['rick astley', 'Never Gonna Give You Up'] })
	})

	test('decodes common HTML entities and numeric references', () => {
		const result = parseWatchPageTags(watchPage('rock &amp; roll, &#39;live&#39;, &#x2764;'))
		expect(result).toEqual({ state: 'ok', tags: ['rock & roll', "'live'", '❤'] })
	})

	test('reads keywords even when the content attribute comes first', () => {
		const html = watchPage(null).replace(
			'</head>',
			'<meta content="satu, dua" name="keywords"></head>',
		)
		expect(parseWatchPageTags(html)).toEqual({ state: 'ok', tags: ['satu', 'dua'] })
	})

	test('reports hidden tags when the page has no keywords meta', () => {
		expect(parseWatchPageTags(watchPage(null))).toEqual({ state: 'hidden', tags: [] })
		expect(parseWatchPageTags(watchPage('  ,  '))).toEqual({ state: 'hidden', tags: [] })
	})

	test('ignores generic keywords on unavailable videos', () => {
		const html = watchPage('video, berbagi, ponsel kamera', 'ERROR')
		expect(parseWatchPageTags(html)).toEqual({ state: 'unavailable', tags: [] })
	})

	test('finds player status when other fields come first', () => {
		const html =
			'<script>var player = {"playabilityStatus":{' +
			JSON.stringify({ reason: 'x'.repeat(300) }).slice(1, -1) +
			',"status":"OK"}};</script>' +
			'<meta name="keywords" content="satu, dua">'
		expect(parseWatchPageTags(html)).toEqual({ state: 'ok', tags: ['satu', 'dua'] })
	})

	test('reports blocked when the response is not a player page', () => {
		expect(parseWatchPageTags('<html><body>Persetujuan diperlukan</body></html>')).toEqual({
			state: 'blocked',
			tags: [],
		})
	})

	test('parses channel keywords in channel mode', () => {
		const html =
			'<script>var ytInitialData = {"channelMetadataRenderer":{}};</script>' +
			'<meta name="keywords" content="mrbeast6000 beast mrbeast Mr.Beast mr">'
		expect(parseWatchPageTags(html, 'channel')).toEqual({
			state: 'ok',
			tags: ['mrbeast6000', 'beast', 'mrbeast', 'Mr.Beast', 'mr'],
		})
	})

	test('parses channel keywords from alternate metadata renderer', () => {
		const html =
			'<script>var ytInitialData = {"channelPlayerMetadataRenderer":{}};</script>' +
			'<meta name="keywords" content="satu dua">'
		expect(parseWatchPageTags(html, 'channel')).toEqual({
			state: 'ok',
			tags: ['satu', 'dua'],
		})
	})

	test('reports blocked when the response is not a channel page', () => {
		expect(parseWatchPageTags('<html>consent wall</html>', 'channel')).toEqual({
			state: 'blocked',
			tags: [],
		})
	})
})

describe('parseYouTubeTarget', () => {
	test('normalizes video links', () => {
		expect(parseYouTubeTarget('https://youtu.be/dQw4w9WgXcQ')).toEqual({
			kind: 'video',
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		})
	})

	test('normalizes channel links', () => {
		expect(parseYouTubeTarget('https://www.youtube.com/@MrBeast')).toEqual({
			kind: 'channel',
			url: 'https://www.youtube.com/@MrBeast',
		})
		expect(parseYouTubeTarget('https://www.youtube.com/@MrBeast/about')).toEqual({
			kind: 'channel',
			url: 'https://www.youtube.com/@MrBeast',
		})
		expect(parseYouTubeTarget('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA')).toEqual({
			kind: 'channel',
			url: 'https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA',
		})
	})

	test('rejects non-YouTube and malformed links', () => {
		expect(parseYouTubeTarget('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
		expect(parseYouTubeTarget('javascript:alert(1)')).toBeNull()
		expect(parseYouTubeTarget('https://www.youtube.com/@bad handle')).toBeNull()
	})
})
