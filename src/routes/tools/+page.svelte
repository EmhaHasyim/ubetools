<script lang="ts">
	import { page } from '$app/state'
	import ToolCard from '#lib/components/ToolCard.svelte'
	import { categories, tools, type Category } from '#lib/tools.ts'
	import { onMount } from 'svelte'

	let query = $state('')
	let category = $state<Category>('Semua')
	let searchEl = $state<HTMLInputElement | null>(null)

	$effect(() => {
		const q = page.url.searchParams.get('q')
		if (q !== null) query = q
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
	<title>Semua tool — ubeTools</title>
	<meta name="description" content="Direktori tool ubeTools: thumbnail dan tag YouTube, audio Suno." />
</svelte:head>

<section class="py-12 sm:py-16" aria-labelledby="tools-heading">
	<div class="mx-auto w-full max-w-5xl px-4 sm:px-6">
		<nav class="text-xs" aria-label="Breadcrumb" style="color: var(--color-on-surface-muted)">
			<a class="footer-link" href="/">Beranda</a>
			<span class="mx-1.5" aria-hidden="true">/</span>
			<span style="color: var(--color-on-surface)">Tool</span>
		</nav>

		<p class="label-mono mt-6">Direktori</p>
		<h1
			id="tools-heading"
			class="mt-2 text-2xl font-semibold tracking-[-0.02em]"
		>
			Semua tool
		</h1>
		<p
			class="mt-3 max-w-xl text-[15px] leading-[1.6]"
			style="color: var(--color-on-surface-muted)"
		>
			Cari berdasarkan nama, atau saring berdasarkan kategori.
		</p>

		<div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
			<form class="search-box w-full max-w-md" role="search" onsubmit={(event) => event.preventDefault()}>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					style="color: var(--color-on-surface-muted)"
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

		<p class="mt-4 text-xs" aria-live="polite" style="color: var(--color-on-surface-muted)">
			{visible.length} dari {tools.length} tool
		</p>

		{#if visible.length}
			<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each visible as tool (tool.slug)}
					<li>
						<ToolCard {tool} />
					</li>
				{/each}
			</ul>
		{:else}
			<div class="empty-state mt-6">
				<p class="text-[15px]">Tidak ada tool yang cocok dengan “{query}”.</p>
				<button
					type="button"
					class="btn-primary mt-4 inline-flex h-10 items-center px-4 text-sm"
					onclick={resetFilters}
				>
					Reset filter
				</button>
			</div>
		{/if}
	</div>
</section>
