export type ToolTone = 'youtube' | 'tags' | 'suno'
export type ToolCategory = 'YouTube' | 'Audio'

export type Tool = {
	slug: string
	name: string
	tagline: string
	description: string
	category: ToolCategory
	tone: ToolTone
	placeholder: string
	capabilities: string[]
}

export const tools: Tool[] = [
	{
		slug: 'youtube-thumbnail',
		name: 'YouTube Thumbnail Downloader',
		tagline: 'Thumbnail terbaik, siap diunduh.',
		description:
			'Tempel link YouTube dan ambil thumbnail resolusi tertinggi yang tersedia dalam satu klik.',
		category: 'YouTube',
		tone: 'youtube',
		placeholder: 'https://www.youtube.com/watch?v=...',
		capabilities: [
			'Mendeteksi ID video dari link yang ditempel.',
			'Menampilkan semua ukuran thumbnail yang tersedia untuk dipilih.',
			'Mengunduh gambar tanpa menyimpan link kamu.',
		],
	},
	{
		slug: 'youtube-tags',
		name: 'YouTube Tag Extractor',
		tagline: 'Tag video atau channel, mudah disalin.',
		description:
			'Tempel link YouTube untuk melihat tag dan keyword publik, lalu salin semuanya sekaligus.',
		category: 'YouTube',
		tone: 'tags',
		placeholder: 'https://www.youtube.com/watch?v=... atau https://www.youtube.com/@channel',
		capabilities: [
			'Membaca metadata publik dari halaman video atau channel.',
			'Menampilkan tag sebagai daftar yang bisa disalin sekaligus.',
			'Menampilkan tag termasuk penanda bila konten menyembunyikannya.',
		],
	},
	{
		slug: 'suno-music',
		name: 'Suno Music Downloader',
		tagline: 'M4A Suno dengan detail lagu, tanpa install.',
		description:
			'Tempel lagu atau playlist Suno, lihat cover dan detailnya, lalu unduh M4A publiknya. Batch dan playlist dikemas dalam satu ZIP.',
		category: 'Audio',
		tone: 'suno',
		placeholder: 'https://suno.com/song/... (satu per baris untuk beberapa lagu)',
		capabilities: [
			'Mendeteksi mode single, batch, atau playlist dari link yang ditempel.',
			'Menampilkan cover, judul, durasi, dan detail lagu sebelum mengunduh M4A.',
			'Mengunduh banyak lagu sebagai satu ZIP bernomor, maksimal 50 link.',
		],
	},
]

export const categories = ['Semua', 'YouTube', 'Audio'] as const
export type Category = (typeof categories)[number]

export function findTool(slug: string) {
	return tools.find((tool) => tool.slug === slug)
}
