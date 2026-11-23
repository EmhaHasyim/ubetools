export type ToolTone = 'youtube' | 'tags' | 'suno'
export type ToolCategory = 'YouTube' | 'Audio'
export type ToolStatus = 'soon' | 'live'

export type Tool = {
	slug: string
	name: string
	tagline: string
	description: string
	category: ToolCategory
	tone: ToolTone
	status: ToolStatus
	placeholder: string
	capabilities: string[]
}

export const tools: Tool[] = [
	{
		slug: 'youtube-thumbnail',
		name: 'YouTube Thumbnail Downloader',
		tagline: 'Thumbnail resolusi tertinggi, satu klik.',
		description:
			'Ambil thumbnail sebuah video YouTube dalam resolusi tertinggi yang tersedia, lalu simpan sebagai gambar.',
		category: 'YouTube',
		tone: 'youtube',
		status: 'live',
		placeholder: 'https://www.youtube.com/watch?v=...',
		capabilities: [
			'Mendeteksi ID video dari link yang ditempel.',
			'Memilih otomatis ukuran thumbnail terbaik yang tersedia.',
			'Mengunduh gambar tanpa menyimpan link kamu.',
		],
	},
	{
		slug: 'youtube-tags',
		name: 'YouTube Tag Extractor',
		tagline: 'Lihat tag di balik video dan channel.',
		description:
			'Baca tag dan keyword yang dipasang pembuat video atau channel, lalu salin semuanya sekaligus.',
		category: 'YouTube',
		tone: 'tags',
		status: 'live',
		placeholder: 'https://www.youtube.com/watch?v=... atau https://www.youtube.com/@channel',
		capabilities: [
			'Membaca metadata publik dari halaman video atau channel.',
			'Menampilkan tag sebagai daftar yang bisa disalin sekaligus.',
			'Menandai konten yang menyembunyikan tag.',
		],
	},
	{
		slug: 'suno-music',
		name: 'Suno Music Downloader',
		tagline: 'Simpan M4A publik dari Suno, lengkap dengan detail lagu.',
		description:
			'Tempel satu lagu, beberapa lagu, atau playlist Suno lalu unduh M4A publiknya. Batch dan playlist dikemas dalam satu ZIP.',
		category: 'Audio',
		tone: 'suno',
		status: 'live',
		placeholder: 'https://suno.com/song/... (satu per baris untuk beberapa lagu)',
		capabilities: [
			'Mendeteksi mode single, batch, atau playlist dari link yang ditempel.',
			'Menampilkan judul, durasi, dan detail lagu sebelum mengunduh M4A.',
			'Mengunduh banyak lagu sebagai satu ZIP bernomor, maksimal 50 link.',
		],
	},
]

export const categories = ['Semua', 'YouTube', 'Audio'] as const
export type Category = (typeof categories)[number]

export function findTool(slug: string) {
	return tools.find((tool) => tool.slug === slug)
}
