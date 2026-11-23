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
	<title>{data.tool.name} | ubeTools</title>
	<meta name="description" content={data.tool.description} />
</svelte:head>

<section aria-labelledby="tool-heading">
	<div class="shell py-10 sm:py-12">
		<nav class="flex flex-wrap items-center gap-x-1 text-xs" aria-label="Breadcrumb">
			<a class="nav-link min-h-11 px-2" href="/">Beranda</a>
			<span aria-hidden="true">/</span>
			<a class="nav-link min-h-11 px-2" href="/tools">Tool</a>
			<span aria-hidden="true">/</span>
			<span class="breadcrumb-current">{data.tool.name}</span>
		</nav>

		<div class="mt-6 grid gap-8 lg:grid-cols-3 lg:items-end">
			<div class="lg:col-span-2">
				<span class="icon-tile">
					<ToolIcon tone={data.tool.tone} size={20} />
				</span>
				<h1 id="tool-heading" class="display-title mt-4">{data.tool.name}</h1>
			</div>
			<p class="lede">{data.tool.description}</p>
		</div>

		<div class="mt-8 grid gap-6 lg:grid-cols-3">
			<div class="card p-5 sm:p-6 lg:col-span-2">
				{#if data.tool.slug === 'youtube-thumbnail'}
					<YoutubeThumbnailTool placeholder={data.tool.placeholder} />
				{:else if data.tool.slug === 'youtube-tags'}
					<YoutubeTagsTool placeholder={data.tool.placeholder} />
				{:else if data.tool.slug === 'suno-music'}
					<SunoMusicTool placeholder={data.tool.placeholder} />
				{/if}
			</div>

			<div class="grid gap-4">
				<div class="card p-5">
					<h2 class="label-mono">Yang bisa dilakukan</h2>
					<ul class="mt-3 space-y-2 text-sm">
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
					<p class="mt-3 text-sm leading-[1.5]">
						Tool ini hanya bekerja dengan konten publik. Hasilnya ditampilkan segera setelah tersedia,
						tanpa akun, tanpa riwayat, dan tanpa menyimpan link.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<section aria-labelledby="others-heading">
	<div class="shell py-12">
		<h2 id="others-heading" class="section-title">Tool lain</h2>
		<ul class="mt-8 grid gap-4 sm:grid-cols-2">
			{#each others as tool (tool.slug)}
				<li>
					<ToolCard {tool} />
				</li>
			{/each}
		</ul>
	</div>
</section>
