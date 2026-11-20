import { describe, expect, test } from 'vitest'
import { parseVideoId, thumbnailSizes, thumbnailUrl } from './youtube.ts'

const VIDEO_ID = 'dQw4w9WgXcQ'

describe('parseVideoId', () => {
	test('extracts the ID from every supported link format', () => {
		const links = [
			`https://www.youtube.com/watch?v=${VIDEO_ID}`,
			`https://youtube.com/watch?v=${VIDEO_ID}`,
			`http://m.youtube.com/watch?v=${VIDEO_ID}`,
			`https://music.youtube.com/watch?v=${VIDEO_ID}`,
			`https://youtu.be/${VIDEO_ID}`,
			`https://youtu.be/${VIDEO_ID}?t=42`,
			`https://www.youtube.com/shorts/${VIDEO_ID}`,
			`https://www.youtube.com/embed/${VIDEO_ID}`,
			`https://www.youtube.com/live/${VIDEO_ID}`,
			`https://www.youtube.com/v/${VIDEO_ID}`,
			`https://www.youtube.com/watch?v=${VIDEO_ID}&list=PL123&t=42s`,
			VIDEO_ID,
		]

		for (const link of links) expect(parseVideoId(link)).toBe(VIDEO_ID)
	})

	test('rejects lookalike hosts, other protocols and malformed IDs', () => {
		const links = [
			`https://youtube.com.evil.com/watch?v=${VIDEO_ID}`,
			`https://evil.com/watch?v=${VIDEO_ID}`,
			`https://www.youtube.com@evil.com/watch?v=${VIDEO_ID}`,
			`ftp://www.youtube.com/watch?v=${VIDEO_ID}`,
			'javascript:alert(1)',
			'https://www.youtube.com/watch?v=short',
			`https://youtu.be/${VIDEO_ID}x`,
			`https://youtu.be/${VIDEO_ID}/extra`,
			'https://www.youtube.com/watch',
			'https://www.youtube.com/channel/UC123',
			'https://www.youtube.com/watch?v=dQw4w9WgXc',
			'',
		]

		for (const link of links) expect(parseVideoId(link)).toBeNull()
	})
})

describe('thumbnailUrl', () => {
	test('builds official i.ytimg.com URLs from validated parts', () => {
		expect(thumbnailSizes).toHaveLength(5)
		expect(thumbnailSizes[0]).toMatchObject({ variant: 'maxresdefault', width: 1280, height: 720 })
		expect(thumbnailUrl(VIDEO_ID, 'maxresdefault')).toBe(
			`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
		)
		expect(thumbnailUrl(VIDEO_ID, 'default')).toBe(`https://i.ytimg.com/vi/${VIDEO_ID}/default.jpg`)
	})

	test('refuses invalid IDs', () => {
		expect(() => thumbnailUrl('short', 'maxresdefault')).toThrow('Invalid YouTube thumbnail input')
	})
})
