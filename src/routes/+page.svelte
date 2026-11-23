<script lang="ts">
	import ToolCard from '#lib/components/ToolCard.svelte'
	import { tools } from '#lib/tools.ts'

	const faqs = [
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
		{
			q: 'Apakah ada batas penggunaan?',
			a: 'Layanan ini gratis digunakan dengan batas permintaan wajar per IP agar server tetap cepat ' +
				'dan stabil.',
		},
	]
</script>

<svelte:head>
	<title>ubeTools | Utilitas web cepat, langsung di browser</title>
	<meta
		name="description"
		content="Thumbnail YouTube, tag video, dan audio Suno di satu tempat."
	/>
</svelte:head>

<section class="hero" data-enter aria-labelledby="hero-heading">
	<div class="wrap hero-grid">
		<div class="hero-text">
			<h1 id="hero-heading" class="display-title">Alat YouTube dan Suno</h1>
			<p class="lede">3 tool gratis untuk YouTube dan Suno, tanpa akun.</p>
			<a class="btn-primary" href="/tools">Pilih tool</a>
			<div class="browser-frame" data-ui role="img" aria-label="Pratinjau direktori tool ubeTools">
				<div class="browser-top">
					<span class="browser-dots"><i></i><i></i><i></i></span>
					<span class="browser-url">ubetools.workers.dev/tools</span>
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
		<h2 id="tools-heading" class="section-title">Tool YouTube dan Suno</h2>
		<p class="lede">Tempel tautan, ambil hasilnya. Tanpa akun dan tanpa riwayat.</p>

		<div class="tool-visual" data-ui role="img" aria-label="Pratinjau hasil thumbnail YouTube">
			<div class="tool-visual-bar">youtube.com/watch?v=video-id</div>
			<div class="tool-visual-body">
				<div class="tool-visual-thumb"></div>
				<div class="tool-visual-rows"><span></span><span></span><span></span></div>
			</div>
		</div>

		<ul class="tool-list">
			{#each tools as tool (tool.slug)}
				<li>
					<ToolCard {tool} />
				</li>
			{/each}
		</ul>

		<a class="btn-secondary" href="/tools">Lihat direktori tool</a>
	</div>
</section>

<section class="section-rule statement" id="faq" aria-labelledby="faq-heading" data-moment="letters-assemble">
	<div class="wrap faq-grid">
		<div>
			<h2 id="faq-heading" class="section-title mo-la__type">Tanpa akun</h2>
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
			<a class="btn-primary faq-cta" href="/tools">Pilih tool</a>
		</div>
	</div>
</section>
