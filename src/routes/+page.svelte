<script lang="ts">
	import ToolCard from '#lib/components/ToolCard.svelte'
	import { tools } from '#lib/tools.ts'

	const faqs = [
		{
			q: 'Seberapa cepat hasilnya?',
			a: 'Tempel tautan, tekan tombol, hasil ditampilkan segera setelah tersedia. Tidak ada ' +
				'antrean, login, atau langkah tambahan.',
		},
		{
			q: 'Apakah tautan atau file media saya disimpan di server?',
			a: 'Tidak. ubeTools tidak memakai database dan tidak menyimpan riwayat tautan, gambar, maupun ' +
				'file audio pengguna.',
		},
		{
			q: 'Konten apa saja yang didukung?',
			a: 'Semua tool hanya memproses video YouTube dan track Suno yang bersifat publik. Konten ' +
				'privat atau terbatas tidak dapat diakses.',
		},
	]
</script>

<svelte:head>
	<title>ubeTools | Ambil thumbnail, tag, dan audio Suno paling cepat</title>
	<meta
		name="description"
		content="Tempel tautan dan dapatkan thumbnail YouTube, tag video, atau M4A Suno dengan cepat. Tanpa install dan tanpa riwayat."
	/>
</svelte:head>

<section class="hero" data-enter aria-labelledby="hero-heading">
	<div class="wrap hero-grid">
		<div class="hero-text">
			<h1 id="hero-heading" class="display-title">Ambil hasilnya secepat tempel link.</h1>
			<p class="lede">Thumbnail YouTube, tag video, dan M4A Suno. Tempel tautan, dapat hasilnya tanpa langkah ribet.</p>
			<a class="btn-primary" href="/tools">Coba sekarang</a>
			<div class="browser-frame" data-ui role="img" aria-label="Pratinjau direktori tool ubeTools">
				<div class="browser-top">
					<span class="browser-dots"><i></i><i></i><i></i></span>
					<span class="browser-url">ubetools.hasyim.workers.dev/tools</span>
				</div>
				<div class="browser-body">
					<div class="browser-row"><span class="browser-icon">▶</span> YouTube Thumbnail Downloader <b>YouTube</b></div>
					<div class="browser-row"><span class="browser-icon">#</span> YouTube Tag Extractor <b>YouTube</b></div>
					<div class="browser-row"><span class="browser-icon">♪</span> Suno Music Downloader <b>Audio</b></div>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="section-rule" aria-labelledby="tools-heading">
	<div class="wrap">
		<h2 id="tools-heading" class="section-title">Tiga tool, satu langkah</h2>
		<p class="lede">Pilih tool, tempel tautan, unduh hasilnya. Tidak perlu install atau daftar.</p>

		<ul class="tool-list">
			{#each tools as tool (tool.slug)}
				<li>
					<ToolCard {tool} />
				</li>
			{/each}
		</ul>

		<a class="btn-secondary" href="/tools">Lihat semua tool</a>
	</div>
</section>

<section class="section-rule statement" id="faq" aria-labelledby="faq-heading" data-moment="letters-assemble">
	<div class="wrap faq-grid">
		<div>
			<h2 id="faq-heading" class="section-title mo-la__type">Cepat, kan?</h2>
			<p class="lede">Jawaban singkat sebelum kamu mulai.</p>
			<svg class="faq-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" role="img" aria-hidden="true">
				<circle cx="12" cy="12" r="9" />
				<path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.4M12 17h.01" stroke-linecap="round" />
			</svg>
		</div>
		<div class="card faq-card">
			{#each faqs as faq (faq.q)}
				<details class="faq-item">
					<summary>{faq.q}</summary>
					<p>{faq.a}</p>
				</details>
			{/each}
			<a class="btn-primary faq-cta" href="/tools">Coba sekarang</a>
		</div>
	</div>
</section>
