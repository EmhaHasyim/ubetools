<script lang="ts">
	import ToolCard from '#lib/components/ToolCard.svelte'
	import ToolIcon from '#lib/components/ToolIcon.svelte'
	import YoutubeThumbnailTool from '#lib/components/tools/YoutubeThumbnailTool.svelte'
	import YoutubeTagsTool from '#lib/components/tools/YoutubeTagsTool.svelte'
	import SunoMusicTool from '#lib/components/tools/SunoMusicTool.svelte'
	import { tools } from '#lib/tools.ts'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const others = $derived(tools.filter((tool) => tool.slug !== data.tool.slug))
</script>

<svelte:head>
	<title>{data.tool.name} — ubeTools</title>
	<meta name="description" content={data.tool.description} />
</svelte:head>

<section class="py-12 sm:py-16" aria-labelledby="tool-heading">
	<div class="mx-auto w-full max-w-3xl px-4 sm:px-6">
		<nav class="text-xs" aria-label="Breadcrumb" style="color: var(--color-on-surface-muted)">
			<a class="footer-link" href="/">Beranda</a>
			<span class="mx-1.5" aria-hidden="true">/</span>
			<a class="footer-link" href="/tools">Tool</a>
			<span class="mx-1.5" aria-hidden="true">/</span>
			<span style="color: var(--color-on-surface)">{data.tool.name}</span>
		</nav>

		<div class="mt-8 flex items-center gap-3">
			<span class="icon-tile">
				<ToolIcon tone={data.tool.tone} size={20} />
			</span>
			{#if data.tool.status === 'soon'}
				<span class="badge">Segera</span>
			{/if}
		</div>

		<h1
			id="tool-heading"
			class="mt-4 text-2xl leading-[1.25] font-semibold tracking-[-0.02em]"
		>
			{data.tool.name}
		</h1>
		<p class="mt-3 max-w-xl text-base leading-[1.6]" style="color: var(--color-on-surface-muted)">
			{data.tool.description}
		</p>

		{#if data.tool.slug === 'youtube-thumbnail'}
			<YoutubeThumbnailTool placeholder={data.tool.placeholder} />
		{:else if data.tool.slug === 'youtube-tags'}
			<YoutubeTagsTool placeholder={data.tool.placeholder} />
		{:else if data.tool.slug === 'suno-music'}
			<SunoMusicTool placeholder={data.tool.placeholder} />
		{:else}
			<div class="command-bar mt-8">
				<label for="tool-url" class="sr-only">Tempel link</label>
				<input
					id="tool-url"
					type="url"
					disabled
					placeholder={data.tool.placeholder}
					aria-describedby="tool-status"
				/>
				<button type="button" class="btn-primary" disabled>Segera</button>
			</div>
			<p id="tool-status" class="mt-2 text-xs" style="color: var(--color-on-surface-muted)">
				Input dinonaktifkan sampai endpoint tool aktif.
			</p>

			<div class="empty-state mt-6">
				<p class="text-[15px] font-medium" style="color: var(--color-on-surface)">
					Hasil akan muncul di sini.
				</p>
				<p class="mt-1 text-sm">
					Tempel link {data.tool.category === 'Audio' ? 'track Suno' : 'video YouTube'} untuk melihat
					{data.tool.tone === 'tags' ? 'tag' : data.tool.tone === 'suno' ? 'audio' : 'thumbnail'}.
				</p>
			</div>
		{/if}

		<div class="mt-10 grid gap-4 sm:grid-cols-2">
			<div class="card p-5">
				<h2 class="label-mono">
					{data.tool.status === 'soon' ? 'Nanti bisa' : 'Yang bisa dilakukan'}
				</h2>
				<ul class="mt-3 space-y-2 text-sm" style="color: var(--color-on-surface-muted)">
					{#each data.tool.capabilities as item (item)}
						<li class="flex gap-2">
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="mt-0.5 shrink-0"
								aria-hidden="true"
							>
								<path d="m5 12 5 5L20 7" />
							</svg>
							<span class="leading-[1.5]">{item}</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="card p-5">
				<h2 class="label-mono">Catatan</h2>
				<p class="mt-3 text-sm leading-[1.5]" style="color: var(--color-on-surface-muted)">
					Tool ini hanya bekerja dengan konten publik. Tidak ada akun, tidak ada riwayat, dan link
					tidak disimpan.
				</p>
				<p class="mt-2 text-sm leading-[1.5]" style="color: var(--color-on-surface-muted)">
					Status rilis: <span style="color: var(--color-on-surface)">
						{data.tool.status === 'soon' ? 'Segera' : 'Aktif'}
					</span>.
				</p>
			</div>
		</div>

		<div class="mt-12 border-t pt-8" style="border-color: var(--color-border)">
			<h2 class="text-lg font-semibold tracking-[-0.01em]">Tool lain</h2>
			<ul class="mt-4 grid gap-4 sm:grid-cols-2">
				{#each others as tool (tool.slug)}
					<li>
						<ToolCard {tool} />
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
