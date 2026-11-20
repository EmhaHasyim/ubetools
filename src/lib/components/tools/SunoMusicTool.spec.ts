import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

function read(path: string) {
	return readFileSync(`${process.cwd()}/${path}`, 'utf8')
}

describe('Suno Music Downloader wiring', () => {
	test('marks the Suno tool as live', async () => {
		const { tools } = await import('#lib/tools.ts')
		expect(tools.find((tool) => tool.slug === 'suno-music')?.status).toBe('live')
	})

	test('does not promise an exact ZIP file count', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		const tool = read('src/lib/tools.ts')
		expect(component).not.toContain('result.count')
		expect(component).not.toContain('tanpa judul atau metadata')
		expect(tool).not.toContain('tanpa judul atau metadata')
	})

	test('shows how many clips were skipped', () => {
		const component = read('src/lib/components/tools/SunoMusicTool.svelte')
		expect(component).toContain('result.skipped')
		expect(component).toContain('dilewati karena audio tidak publik')
	})

	test('renders the Suno component on its tool page', () => {
		const page = read('src/routes/tools/[slug]/+page.svelte')
		expect(page).toContain("import SunoMusicTool from '#lib/components/tools/SunoMusicTool.svelte'")
		expect(page).toContain("data.tool.slug === 'suno-music'")
	})
})
