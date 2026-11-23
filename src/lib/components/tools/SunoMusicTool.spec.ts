import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

function read(path: string) {
	return readFileSync(`${process.cwd()}/${path}`, 'utf8')
}

describe('Suno Music Downloader wiring', () => {
	test('registers the Suno tool', async () => {
		const { tools } = await import('#lib/tools.ts')
		expect(tools.some((tool) => tool.slug === 'suno-music')).toBe(true)
	})

	test('does not promise an exact ZIP file count', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		const tool = read('src/lib/tools.ts')
		expect(component).not.toContain('result.count')
		expect(component).not.toContain('tanpa judul atau metadata')
		expect(tool).not.toContain('tanpa judul atau metadata')
	})

	test('lets the server name downloads, including single songs', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).not.toContain('download=')
	})

	test('uses the short download label for a single song', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).not.toContain('Unduh M4A')
		expect(component).toContain("'Unduh' : 'Unduh ZIP'")
	})

	test('shows cover art and detailed metadata in the result card', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).toContain('track.coverUrl')
		expect(component).toContain('track.playCount')
		expect(component).toContain('alt={`Cover ${track.title')
	})

	test('shows a loading animation while preparing the download', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).toContain('aria-live="polite"')
		expect(component).toContain('loading-ring')
		const styles = read('src/routes/layout.css')
		expect(styles).toContain('.loading-ring')
	})

	test('shows how many clips were skipped', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).toContain('result.skipped')
		expect(component).toContain('lagu tidak bisa diambil')
	})

	test('offers one card for each download mode', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).toContain("label: 'Single'")
		expect(component).toContain("label: 'Batch'")
		expect(component).toContain("label: 'Playlist'")
	})

	test('CSP allows every cover host the parser accepts', () => {
		const headers = read('_headers')
		for (const host of ['cdn2.suno.ai', 'suno.com', 'www.suno.com'])
			expect(headers).toContain(`https://${host}`)
	})

	test('renders the Suno component on its tool page', () => {
		const page = read('src/routes/tools/[slug]/+page.svelte')
		expect(page).toContain("import SunoMusicTool from '#lib/components/tools/SunoMusicTool.svelte'")
		expect(page).toContain("data.tool.slug === 'suno-music'")
	})
})
