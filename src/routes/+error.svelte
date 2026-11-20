<script lang="ts">
	import { page } from '$app/state'
</script>

<svelte:head>
	<title>{page.status} — ubeTools</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center">
	<div class="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
		<p class="label-mono">{page.status}</p>
		<h1 class="mt-3 text-2xl font-semibold tracking-[-0.02em]">
			{#if page.status === 404}
				Halaman tidak ditemukan.
			{:else}
				Terjadi kesalahan.
			{/if}
		</h1>
		<p class="mt-3 text-[15px] leading-[1.6]" style="color: var(--color-on-surface-muted)">
			{#if page.status === 404}
				Alamat yang kamu buka tidak ada. Mungkin sudah dipindahkan atau salah ketik.
			{:else}
				Server gagal memproses permintaan. Coba lagi sebentar lagi.
			{/if}
		</p>
		<a href="/" class="btn-primary mt-8 inline-flex h-10 items-center px-4 text-sm">
			Kembali ke beranda
		</a>
	</div>
</div>
