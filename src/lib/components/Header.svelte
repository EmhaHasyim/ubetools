<script lang="ts">
	import { page } from '$app/state'
	import { onMount } from 'svelte'

	let theme = $state<'light' | 'dark'>('light')

	onMount(() => {
		theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
	})

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark'
		document.documentElement.dataset.theme = theme
		try {
			localStorage.setItem('ubetools-theme', theme)
		} catch {
			// localStorage can be blocked; the theme still applies for this view.
		}
	}
</script>

<header class="nav">
	<a class="skip-link" href="#main">
		Lewati ke konten <span class="visually-hidden">Skip to content</span>
	</a>
	<div class="wrap nav-row">
		<a href="/" class="brand" aria-label="ubeTools — beranda">
			<span>ubeTools</span>
			<img src="/logo-64.png" alt="" width="24" height="24" />
		</a>

		<div class="nav-actions">
			<nav aria-label="Navigasi utama">
				<a
					class="nav-link"
					href="/tools"
					aria-current={page.url.pathname.startsWith('/tools') ? 'page' : undefined}
				>
					Tools
				</a>
			</nav>
			<button
				type="button"
				class="icon-btn"
				onclick={toggleTheme}
				aria-label={theme === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'}
			>
				{#if theme === 'dark'}
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="4" />
						<path
							d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
						/>
					</svg>
				{:else}
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
</header>
