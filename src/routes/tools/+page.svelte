<script lang="ts">
	import { page } from '$app/state'
	import ToolIcon from '#lib/components/ToolIcon.svelte'
	import { categories, tools, type Category } from '#lib/tools.ts'
	import { onMount } from 'svelte'

	let query = $state('')
	let category = $state<Category>('Semua')
	let searchEl = $state<HTMLInputElement | null>(null)

	$effect(() => {
		const q = page.url.searchParams.get('q')
		if (q !== null && q !== query) query = q
	})

	const visible = $derived.by(() => {
		const q = query.trim().toLowerCase()
		return tools.filter((tool) => {
			const inCategory = category === 'Semua' || tool.category === category
			const haystack = `${tool.name} ${tool.tagline} ${tool.description} ${tool.category}`
			return inCategory && (!q || haystack.toLowerCase().includes(q))
		})
	})

	onMount(() => {
		if (page.url.searchParams.get('q')) searchEl?.focus()
	})

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
		const target = event.target as HTMLElement | null
		if (
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		)
			return
		event.preventDefault()
		searchEl?.focus()
	}

	function resetFilters() {
		query = ''
		category = 'Semua'
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>Semua tool | ubeTools</title>
	<meta name="description" content="Direktori tool ubeTools: thumbnail dan tag YouTube, audio Suno." />
</svelte:head>

<section aria-labelledby="tools-heading">
	<div class="shell py-12 sm:py-14">
		<nav class="text-xs" aria-label="Breadcrumb">
			<a class="footer-link" href="/">Beranda</a>
			<span class="mx-1.5" aria-hidden="true">/</span>
			<span class="breadcrumb-current">Tool</span>
		</nav>

		<h1 id="tools-heading" class="display-title mt-6">Semua tool</h1>
		<p class="lede mt-4">Cari berdasarkan nama, atau saring berdasarkan kategori.</p>

		<div class="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
			<form class="search-box w-full max-w-md" role="search" onsubmit={(event) => event.preventDefault()}>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					class="search-icon"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.5-3.5" />
				</svg>
				<label for="tool-search" class="sr-only">Cari tool</label>
				<input
					id="tool-search"
					bind:this={searchEl}
					bind:value={query}
					type="search"
					autocomplete="off"
					placeholder="Cari: thumbnail, tag, audio…"
				/>
				<kbd class="search-kbd">/</kbd>
			</form>

			<div class="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
				{#each categories as item (item)}
					<button
						type="button"
						class="filter-chip"
						class:is-active={category === item}
						aria-pressed={category === item}
						onclick={() => (category = item)}
					>
						{item}
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-10 section-rule">
			<p class="label-mono pt-4 text-xs" aria-live="polite">
				{visible.length} dari {tools.length} tool
			</p>

			{#if visible.length}
				<ul class="mt-2">
					{#each visible as tool, i (tool.slug)}
						<li>
							<a class="index-row" href="/tools/{tool.slug}">
								<span class="label-mono index-number">{String(i + 1).padStart(2, '0')}</span>
								<span class="icon-tile">
									<ToolIcon tone={tool.tone} size={20} />
								</span>
								<span class="min-w-0">
									<span class="block font-semibold">{tool.name}</span>
									<span class="index-tagline">{tool.tagline}</span>
								</span>
								<span class="badge">{tool.category}</span>
								<svg
									class="index-arrow"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.75"
									stroke-linecap="round"
									aria-hidden="true"
								>
									<path d="M5 12h14m-6-6 6 6-6 6" />
								</svg>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="empty-state mt-4">
					<p>Tidak ada tool yang cocok dengan “{query}”.</p>
					<button type="button" class="btn-primary mt-4" onclick={resetFilters}>
						Reset filter
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
