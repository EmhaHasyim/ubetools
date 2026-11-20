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
	<title>ubeTools — Utilitas web cepat, langsung di browser</title>
	<meta
		name="description"
		content="Unduh thumbnail YouTube, ekstrak tag video, dan simpan audio Suno dari satu tempat."
	/>
</svelte:head>

<section class="py-12 sm:py-16" aria-labelledby="hero-heading">
	<div class="mx-auto w-full max-w-5xl px-4 sm:px-6">
		<h1
			id="hero-heading"
			class="max-w-2xl text-[clamp(1.875rem,3vw,2.5rem)] leading-[1.15] font-bold tracking-[-0.025em]"
		>
			Utilitas web cepat, langsung di browser.
		</h1>

		<p
			class="mt-4 max-w-xl text-base leading-[1.6]"
			style="color: var(--color-on-surface-muted)"
		>
			Unduh thumbnail YouTube, ekstrak tag video, dan simpan audio Suno dari satu tempat.
		</p>
	</div>
</section>

<section
	class="border-t py-12 sm:py-16"
	style="border-color: var(--color-border)"
	aria-labelledby="featured-heading"
>
	<div class="mx-auto w-full max-w-5xl px-4 sm:px-6">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<h2 id="featured-heading" class="text-lg font-semibold tracking-[-0.01em]">Daftar Tool</h2>

			<a class="text-[13px] font-medium" href="/tools" style="color: var(--color-primary)">
				Semua tool →
			</a>
		</div>

		<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each tools as tool (tool.slug)}
				<li>
					<ToolCard {tool} />
				</li>
			{/each}
		</ul>
	</div>
</section>

<section
	class="border-t py-12 sm:py-16"
	style="border-color: var(--color-border)"
	id="faq"
	aria-labelledby="faq-heading"
>
	<div class="mx-auto w-full max-w-5xl px-4 sm:px-6">
		<h2 id="faq-heading" class="text-lg font-semibold tracking-[-0.01em]">FAQ</h2>

		<div class="card mt-6">
			{#each faqs as faq (faq.q)}
				<details
					class="faq-item border-b px-5 py-4 last:border-b-0"
					style="border-color: var(--color-border)"
				>
					<summary class="cursor-pointer text-[15px] font-medium">{faq.q}</summary>
					<p
						class="mt-2 text-sm leading-[1.6]"
						style="color: var(--color-on-surface-muted)"
					>
						{faq.a}
					</p>
				</details>
			{/each}
		</div>
	</div>
</section>
