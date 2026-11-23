<script lang="ts">
	import Footer from '#lib/components/Footer.svelte'
	import Header from '#lib/components/Header.svelte'
	import './layout.css'

	let { children } = $props()
</script>

<Header />

<main id="main">
	{@render children()}
</main>

<Footer />

<svelte:head>
	<script type="module" src="/assets/moments/moments.js"></script>
</svelte:head>
