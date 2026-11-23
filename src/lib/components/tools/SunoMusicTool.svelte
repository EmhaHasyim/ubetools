<script lang="ts">
	import { eden } from '#lib/client/client.ts'
	import { formatSunoDate } from '#lib/suno.ts'

	type SunoTrack = {
		id: string
		title?: string
		artist?: string
		duration?: string
		version?: string
		tags: string[]
		createdAt?: string
		coverUrl?: string
		playCount?: number
	}

	type SunoResult = {
		downloadUrl: string
		mode: 'single' | 'batch' | 'playlist'
		tracks: SunoTrack[]
		totalDuration?: string
		playlist?: { name?: string; owner?: string; songCount?: number }
		skipped?: number
	}

	let { placeholder }: { placeholder: string } = $props()

	type SunoMode = 'single' | 'batch' | 'playlist'

	const modes: { mode: SunoMode; label: string; description: string; placeholder: string }[] = [
		{
			mode: 'single',
			label: 'Single',
			description: 'Satu link lagu atau share link Suno, hasil satu file M4A.',
			placeholder: 'https://suno.com/s/...',
		},
		{
			mode: 'batch',
			label: 'Batch',
			description: 'Beberapa link lagu, hasil satu file ZIP berisi M4A.',
			placeholder: 'https://suno.com/song/...\nhttps://suno.com/song/...',
		},
		{
			mode: 'playlist',
			label: 'Playlist',
			description: 'Satu link playlist, hasil satu file ZIP berisi M4A.',
			placeholder: 'https://suno.com/playlist/...',
		},
	]

	let mode = $state<SunoMode>('single')
	let input = $state('')
	let loading = $state(false)
	let errorMessage = $state('')
	let result = $state<SunoResult | null>(null)

	const activeMode = $derived(modes.find((item) => item.mode === mode)!)
	const submitLabel = $derived(loading ? 'Memproses...' : 'Siapkan unduhan')
	const downloadLabel = $derived(result?.mode === 'single' ? 'Unduh' : 'Unduh ZIP')
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

<div class="mt-6 grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Mode unduhan">
	{#each modes as item (item.mode)}
		<button
			type="button"
			aria-pressed={mode === item.mode}
			aria-label={`${item.label}: ${item.description}`}
			class="card p-3 text-left sm:p-4"
			style="border-color: {mode === item.mode
				? 'var(--color-primary)'
				: 'var(--color-rule)'}; background: {mode === item.mode
				? 'var(--color-paper-3)'
				: 'var(--color-paper-2)'}"
			onclick={() => {
				mode = item.mode
				input = ''
				result = null
				errorMessage = ''
			}}
		>
			<p class="text-sm font-semibold" style="color: var(--color-ink)">{item.label}</p>
			<p class="mt-1 hidden text-xs leading-[1.5] sm:block" style="color: var(--color-muted)">
				{item.description}
			</p>
		</button>
	{/each}
</div>

<form class="command-bar mt-6" onsubmit={submit}>
	<label for="suno-input" class="sr-only">Link Suno</label>
	<textarea
		id="suno-input"
		bind:value={input}
		rows="3"
		required
		disabled={loading}
		placeholder={mode === 'single' ? placeholder : activeMode.placeholder}
		aria-describedby="suno-hint"
	></textarea>
	<button type="submit" class="btn-primary min-w-36" disabled={loading}>{submitLabel}</button>
</form>
<p id="suno-hint" class="mt-2 text-xs" style="color: var(--color-muted)">
	Tempel satu link lagu, beberapa link, atau satu link playlist. Detail lagu ditampilkan sebelum
	unduh. Maksimal 50 lagu, M4A publik tanpa konversi.
</p>

{#if loading}
	<div class="card mt-6 p-5" role="status" aria-live="polite">
		<div class="flex items-center gap-3">
			<span class="loading-ring" aria-hidden="true"></span>
			<div>
				<p class="text-sm font-medium" style="color: var(--color-ink)">Menyiapkan unduhan...</p>
				<p class="mt-1 text-xs" style="color: var(--color-muted)">Mengambil detail lagu dari Suno.</p>
			</div>
		</div>
	</div>
{/if}

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
				{modeLabel}
				{#if result.skipped}
					<span class="block text-xs" style="color: var(--color-muted)">
						{result.skipped} lagu tidak bisa diambil.
					</span>
				{/if}
			</p>
			<a
				class="btn-primary"
				href={result.downloadUrl}
			>
				{downloadLabel}
			</a>
		</div>

		<p class="mt-3 text-sm" style="color: var(--color-muted)">
			{result.tracks.length} lagu, {result.totalDuration ?? '—'} total, M4A, Opus
		</p>

		{#if result.playlist}
			<div
				class="mt-4 rounded-lg p-4"
				style="background: var(--color-paper-3)"
			>
				<p class="text-sm font-semibold" style="color: var(--color-ink)">
					{result.playlist.name ?? 'Playlist Suno'}
				</p>
				<p class="mt-1 text-sm" style="color: var(--color-muted)">
					{result.playlist.owner ?? 'Pemilik tidak diketahui'}, {result.playlist.songCount ?? result.tracks.length} lagu, {result.totalDuration ?? '—'}
				</p>
			</div>
		{/if}

		<ul class="mt-4 space-y-3">
			{#each result.tracks as track, index (track.id + '-' + index)}
				<li class="rounded-lg p-4" style="background: var(--color-paper-3)">
					<div class="flex items-start gap-3">
						<div
							class="flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
							style="background: var(--color-surface-subtle); width: {result.mode === 'single'
								? '6rem'
								: '3.5rem'}; aspect-ratio: 1"
						>
							{#if track.coverUrl}
								<img
									src={track.coverUrl}
									alt={`Cover ${track.title ?? `lagu ${index + 1}`}`}
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							{:else}
								<span aria-hidden="true" style="color: var(--color-muted)">♪</span>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p
								class="truncate text-sm font-semibold"
								style="color: var(--color-ink)"
							>
								{index + 1}. {track.title ?? `Lagu ${index + 1}`}
							</p>
							<p class="mt-1 text-sm" style="color: var(--color-muted)">
								{[
									track.artist,
									track.version,
									formatSunoDate(track.createdAt),
									track.playCount !== undefined
										? `${track.playCount.toLocaleString('id-ID')} putaran`
										: null,
								]
									.filter(Boolean)
									.join(' · ') || 'Suno'}
							</p>
						</div>
						{#if track.duration}
							<span class="label-mono shrink-0" style="color: var(--color-ink)">
								{track.duration}
							</span>
							{/if}
						</div>
						{#if track.tags.length}
							<div class="mt-3 flex flex-wrap gap-2">
								{#each track.tags as tag (tag)}
									<span class="badge">{tag}</span>
								{/each}
							</div>
							{/if}
					</li>
				{/each}
		</ul>
	</div>
{:else if !loading && !errorMessage}
	<div class="empty-state mt-6">
		<p class="text-base font-medium sm:text-[15px]" style="color: var(--color-ink)">
			Hasil akan muncul di sini.
		</p>
		<p class="mt-1 text-sm">
			Tempel link Suno untuk melihat detail lagu lalu mengunduh M4A publiknya.
		</p>
	</div>
{/if}
