import { describe, expect, test } from 'vitest'
import { songFileName } from './suno.ts'

describe('songFileName', () => {
	test('uses the title with an m4a extension', () => {
		expect(songFileName('Stay Where You Are', 0)).toBe('Stay Where You Are 1.m4a')
	})

	test('omits the track number when not needed', () => {
		expect(songFileName('A Room Gone Quiet', 14, false)).toBe('A Room Gone Quiet.m4a')
	})

	test('falls back to the track number for a missing or empty title', () => {
		expect(songFileName(undefined, 3)).toBe('04.m4a')
		expect(songFileName('   ', 0)).toBe('01.m4a')
	})

	test('removes path separators and shell metacharacters', () => {
		expect(songFileName(`../../etc/passwd && rm -rf /`, 0)).toBe('.. .. etc passwd rm -rf 1.m4a')
		expect(songFileName('a/b\\c:d*e?f"g<h>i|j', 0)).toBe('a b c d e f g h i j 1.m4a')
	})

	test('caps long titles at 80 characters', () => {
		const name = songFileName('x'.repeat(200), 1)
		expect(name.endsWith('.m4a')).toBe(true)
		expect(name.length).toBe(84)
	})
})
