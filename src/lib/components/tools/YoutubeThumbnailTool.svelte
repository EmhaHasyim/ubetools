<script lang="ts">
	import { eden } from '#lib/client/client.ts'

	type Thumbnail = {
		variant: string
		label: string
		width: number
		height: number
		url: string
	}

	let { placeholder }: { placeholder: string } = $props()

	let url = $state('')
	let loading = $state(false)
	let errorMessage = $state('')
	let copied = $state('')
	let result = $state<{ videoId: string; thumbnails: Thumbnail[] } | null>(null)
	const best = $derived(result?.thumbnails[0] ?? null)

	const submitLabel = $derived(loading ? 'Memproses...' : 'Ambil thumbnail')

	async function submit(event: SubmitEvent) {
		event.preventDefault()
		if (loading) return

		loading = true
		errorMessage = ''
		copied = ''
		result = null

		try {
			const response = await eden.api.tools['youtube-thumbnail'].post({ url: url.trim() })
			if (response.error)
				errorMessage =
					response.error.value.detail ?? 'Gagal mengambil thumbnail. Periksa link lalu coba lagi.'
			else result = response.data
		} catch {
			errorMessage = 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.'
		} finally {
			loading = false
		}
	}

	function downloadHref(videoId: string, variant: string) {
		return `/api/tools/youtube-thumbnail/download?id=${videoId}&variant=${variant}`
	}

	async function copy(thumbnail: Thumbnail) {
		try {
			await navigator.clipboard.writeText(thumbnail.url)
			copied = thumbnail.variant
			setTimeout(() => {
				if (copied === thumbnail.variant) copied = ''
			}, 2000)
		} catch {
			errorMessage = 'Gagal menyalin URL. Salin manual lewat tautan Buka.'
		}
	}
</script>

<form class="command-bar mt-8" onsubmit={submit}>
	<label for="youtube-thumbnail-url" class="sr-only">Link video YouTube</label>
	<input
		id="youtube-thumbnail-url"
		type="text"
		inputmode="url"
		bind:value={url}
		required
		disabled={loading}
		placeholder={placeholder}
		aria-describedby="youtube-thumbnail-hint"
	/>
	<button type="submit" class="btn-primary min-w-36" disabled={loading}>{submitLabel}</button>
</form>
<p
	id="youtube-thumbnail-hint"
	class="mt-2 text-xs"
	style="color: var(--color-muted)"
>
	Mendukung link watch, youtu.be, Shorts, dan ID video 11 karakter.
</p>

{#if errorMessage}
	<div class="alert-error mt-6" role="alert">
		<p class="text-sm font-medium" style="color: var(--color-error)">Terjadi kesalahan</p>
		<p class="mt-1 text-sm leading-[1.5]" style="color: var(--color-muted)">
			{errorMessage}
		</p>
	</div>
{/if}

{#if best && result}
	<article class="card mt-6 p-3">
		<div
			class="aspect-video w-full overflow-hidden rounded-md"
			style="background: var(--color-paper-3)"
		>
			<img
				src={best.url}
				alt={`Thumbnail ${best.label} ${best.width}×${best.height}`}
				width={best.width}
				height={best.height}
				fetchpriority="high"
				decoding="async"
				class="h-full w-full object-contain"
			/>
		</div>
		<p class="label-mono mt-3">{best.label} · {best.width}×{best.height}</p>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<a
				class="btn-primary inline-flex h-10 items-center px-4"
				href={downloadHref(result.videoId, best.variant)}
			>
				Unduh
			</a>
			<button
				type="button"
				class="btn-secondary"
				class:is-copied={copied === best.variant}
				onclick={() => copy(best)}
			>
				{copied === best.variant ? 'Tersalin' : 'Salin URL'}
			</button>
			<a
				class="footer-link text-xs"
				href={best.url}
				target="_blank"
				rel="noopener noreferrer"
			>
				Buka
			</a>
		</div>
	</article>
{:else if !loading && !errorMessage}
	<div class="empty-state mt-6">
		<p class="text-base font-medium sm:text-[15px]" style="color: var(--color-ink)">
			Hasil akan muncul di sini.
		</p>
		<p class="mt-1 text-sm">
			Tempel link video YouTube untuk mengambil thumbnail kualitas terbaik yang tersedia.
		</p>
	</div>
{/if}
