<script lang="ts">
	import Footer from '#lib/components/Footer.svelte'
	import Header from '#lib/components/Header.svelte'
	import './layout.css'

	let { children } = $props()
</script>

<div class="flex min-h-screen flex-col" style="background: var(--color-surface)">
	<a
		href="#main"
		class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
		style="background: var(--color-primary); color: var(--color-on-primary)"
	>
		Lewati ke konten
	</a>

	<Header />

	<main id="main" class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
