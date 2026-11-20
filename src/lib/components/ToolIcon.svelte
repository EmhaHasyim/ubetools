<script lang="ts">
	import type { ToolTone } from '#lib/tools.ts'

	let { tone, size = 24 }: { tone: ToolTone; size?: number } = $props()
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if tone === 'youtube'}
		<rect x="2.5" y="5.5" width="19" height="13" rx="4" />
		<path d="m10.4 9.6 4.6 2.4-4.6 2.4Z" fill="currentColor" stroke="none" />
	{:else if tone === 'tags'}
		<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
		<circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
	{:else}
		<path d="M9 18V6l10-2v12" />
		<circle cx="6.5" cy="18" r="2.5" />
		<circle cx="16.5" cy="16" r="2.5" />
	{/if}
</svg>
