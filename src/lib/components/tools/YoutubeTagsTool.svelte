<script lang="ts">
	import { eden } from '#lib/client/client.ts'

	type TagResult = { kind: 'video' | 'channel'; state: 'ok' | 'hidden'; tags: string[] }

	let { placeholder }: { placeholder: string } = $props()

	let url = $state('')
	let loading = $state(false)
	let errorMessage = $state('')
	let copied = $state(false)
	let copyTimer: ReturnType<typeof setTimeout> | undefined
	let result = $state<TagResult | null>(null)

	const submitLabel = $derived(loading ? 'Memproses...' : 'Ambil tag')

	async function submit(event: SubmitEvent) {
		event.preventDefault()
		if (loading) return

		loading = true
		errorMessage = ''
		copied = false
		result = null

		try {
			const response = await eden.api.tools['youtube-tags'].post({ url: url.trim() })
			if (response.error)
				errorMessage = response.error.value.detail ?? 'Gagal mengambil tag. Periksa link lalu coba lagi.'
			else result = response.data
		} catch {
			errorMessage = 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.'
		} finally {
			loading = false
		}
	}

	async function copyAll() {
		if (!result) return
		try {
			await navigator.clipboard.writeText(result.tags.join(', '))
			clearTimeout(copyTimer)
			copied = true
			copyTimer = setTimeout(() => (copied = false), 2000)
		} catch {
			errorMessage = 'Gagal menyalin tag. Pilih dan salin teks secara manual.'
		}
	}
</script>

<form class="command-bar mt-8" onsubmit={submit}>
	<label for="youtube-tags-url" class="sr-only">Link video atau channel YouTube</label>
	<input
		id="youtube-tags-url"
		type="text"
		inputmode="url"
		bind:value={url}
		required
		disabled={loading}
		placeholder={placeholder}
		aria-describedby="youtube-tags-hint"
	/>
	<button type="submit" class="btn-primary min-w-36" disabled={loading}>{submitLabel}</button>
</form>
<p id="youtube-tags-hint" class="mt-2 text-xs" style="color: var(--color-muted)">
	Mendukung link video dan channel publik, termasuk youtu.be dan /@channel.
</p>

{#if errorMessage}
	<div class="alert-error mt-6" role="alert">
		<p class="text-sm font-medium" style="color: var(--color-error)">Terjadi kesalahan</p>
		<p class="mt-1 text-sm leading-[1.5]" style="color: var(--color-muted)">
			{errorMessage}
		</p>
	</div>
{/if}

{#if result}
	<div class="card mt-6 p-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm font-medium" style="color: var(--color-ink)">
				{result.state === 'hidden'
					? 'Tidak ada tag yang terlihat pada halaman ini.'
					: `${result.tags.length} tag ditemukan`}
			</p>
			{#if result.state === 'ok'}
				<button type="button" class="btn-secondary" onclick={copyAll}>
					{copied ? 'Tersalin' : 'Salin semua'}
				</button>
			{/if}
		</div>
		{#if result.state === 'ok'}
			<ul class="mt-4 flex flex-wrap gap-2" aria-label="Daftar tag" data-tags={result.tags.length}>
				{#each result.tags as tag (tag)}
					<li class="badge">{tag}</li>
				{/each}
			</ul>
		{/if}
	</div>
{:else if !loading && !errorMessage}
	<div class="empty-state mt-6">
		<p class="text-base font-medium sm:text-[15px]" style="color: var(--color-ink)">
			Hasil akan muncul di sini.
		</p>
		<p class="mt-1 text-sm">
			Tempel link video atau channel YouTube untuk melihat semua tag yang bisa disalin.
		</p>
	</div>
{/if}
