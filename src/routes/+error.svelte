<script lang="ts">
	import { page } from '$app/state'
</script>

<svelte:head>
	<title>{page.status} | ubeTools</title>
</svelte:head>

<div class="shell flex min-h-[60vh] items-center py-16">
	<div>
		<h1 class="display-title">
			{#if page.status === 404}
				Halaman tidak ditemukan.
			{:else}
				Terjadi kesalahan.
			{/if}
		</h1>
		<p class="lede mt-5">
			{#if page.status === 404}
				Alamat yang kamu buka tidak ada. Mungkin sudah dipindahkan atau salah ketik.
			{:else}
				Server gagal memproses permintaan. Coba lagi sebentar lagi.
			{/if}
		</p>
		<a href="/" class="btn-primary mt-8">Kembali ke beranda</a>
	</div>
</div>
