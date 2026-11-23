import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const dark = css.match(/\[data-theme='dark'\] \{([^}]*)\}/)?.[1] ?? ''
const values = (block: string) =>
	Object.fromEntries([...block.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]))
const darkValues = values(dark)
const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex: string) => {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

describe('theme tokens', () => {
	it('defines a dark value for every colour token', () => {
		const tokens = [...css.matchAll(/^\s*(--color-[\w-]+):/gm)].map((match) => match[1])
		const missing = tokens.filter((token) => !(token in darkValues))

		expect(missing).toEqual([])
	})

	it('gives dark text a contrast ratio of at least 4.5 on each dark surface', () => {
		const surfaces = ['--color-paper', '--color-paper-2', '--color-paper-3']
		const texts = ['--color-ink', '--color-ink-2', '--color-muted']

		for (const surface of surfaces) {
			for (const text of texts) {
				const bg = luminance(darkValues[surface])
				const fg = luminance(darkValues[text])
				expect((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toBeGreaterThanOrEqual(4.5)
			}
		}
	})

	it('uses a light accent with readable text on it in dark mode', () => {
		expect(darkValues['--color-accent-ink']).toBe(darkValues['--color-paper'])
		expect(darkValues['--color-accent']).not.toBe(darkValues['--color-focus'])
	})
})
