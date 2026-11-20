<script lang="ts">
	import { eden } from '#lib/client/client.ts'

	type SunoResult = {
		downloadUrl: string
		mode: 'single' | 'batch' | 'playlist'
		skipped?: number
	}

	let { placeholder }: { placeholder: string } = $props()

	let input = $state('')
	let loading = $state(false)
	let errorMessage = $state('')
	let result = $state<SunoResult | null>(null)

	const submitLabel = $derived(loading ? 'Memproses...' : 'Siapkan unduhan')
	const modeLabel = $derived(
		result?.mode === 'single' ? 'Satu lagu' : result?.mode === 'playlist' ? 'Playlist' : 'Beberapa lagu',
	)

	async function submit(event: SubmitEvent) {
		event.preventDefault()
		if (loading) return

		loading = true
		errorMessage = ''
		result = null

		try {
			const response = await eden.api.tools['suno-music'].post({ input: input.trim() })
			if (response.error)
				errorMessage =
					response.error.value.detail ?? 'Gagal menyiapkan unduhan. Periksa link lalu coba lagi.'
			else result = response.data
		} catch {
			errorMessage = 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.'
		} finally {
			loading = false
		}
	}
</script>

<form class="command-bar mt-8" onsubmit={submit}>
	<label for="suno-input" class="sr-only">Link Suno</label>
	<textarea
		id="suno-input"
		bind:value={input}
		rows="3"
		required
		disabled={loading}
		placeholder={placeholder}
		aria-describedby="suno-hint"
	></textarea>
	<button type="submit" class="btn-primary min-w-36" disabled={loading}>{submitLabel}</button>
</form>
<p id="suno-hint" class="mt-2 text-xs" style="color: var(--color-on-surface-muted)">
	Tempel satu link lagu, beberapa link, atau satu link playlist. Maksimal 50 lagu, M4A publik tanpa
	konversi.
</p>

{#if errorMessage}
	<div class="alert-error mt-6" role="alert">
		<p class="text-sm font-medium" style="color: var(--color-error)">Terjadi kesalahan</p>
		<p class="mt-1 text-sm leading-[1.5]" style="color: var(--color-on-surface-muted)">
			{errorMessage}
		</p>
	</div>
{/if}

{#if result}
	<div class="card mt-6 p-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm font-medium" style="color: var(--color-on-surface)">
				{modeLabel}
				{#if result.skipped}
					<span class="block text-xs" style="color: var(--color-on-surface-muted)">
						{result.skipped} lagu dilewati karena audio tidak publik.
					</span>
				{/if}
			</p>
			<a class="btn-primary" href={result.downloadUrl} download>
				{result.mode === 'single' ? 'Unduh M4A' : 'Unduh ZIP'}
			</a>
		</div>
	</div>
{:else if !loading && !errorMessage}
	<div class="empty-state mt-6">
		<p class="text-[15px] font-medium" style="color: var(--color-on-surface)">
			Hasil akan muncul di sini.
		</p>
		<p class="mt-1 text-sm">
			Tempel link Suno untuk mengunduh audio M4A publiknya tanpa metadata tambahan.
		</p>
	</div>
{/if}
