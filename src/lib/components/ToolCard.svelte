<script lang="ts">
	import type { Tool } from '#lib/tools.ts'
	import ToolIcon from './ToolIcon.svelte'

	let { tool }: { tool: Tool } = $props()
</script>

<a
	href="/tools/{tool.slug}"
	class="tool-card card flex h-full flex-col p-5"
	aria-label={tool.name}
>
	<span class="icon-tile">
		<ToolIcon tone={tool.tone} size={20} />
	</span>

	<h3 class="mt-4 text-base leading-[1.35] font-semibold tracking-[-0.01em]">{tool.name}</h3>
	<p class="mt-2 line-clamp-2 text-sm leading-[1.5]" style="color: var(--color-muted)">
		{tool.tagline}
	</p>
</a>
