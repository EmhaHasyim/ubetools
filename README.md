# ubeTools

Kumpulan web tool praktis yang berjalan di Cloudflare Workers—satu halaman per tool dengan API ringan berbasis Elysia.

## Tools

| Tool                         | Deskripsi                                           | Status |
| :--------------------------- | :-------------------------------------------------- | :----- |
| YouTube Thumbnail Downloader | Unduh thumbnail video YouTube berbagai resolusi     | Aktif  |
| YouTube Tag Extractor        | Ambil tag video/channel YouTube, salin sekaligus    | Aktif  |
| Suno Music Downloader        | Unduh M4A publik Suno, single/batch/playlist ke ZIP | Aktif  |

Suno: M4A publik saja, maksimal 50 link, tanpa akun dan tanpa penyimpanan.

## Tech Stack

- **Frontend:** SvelteKit 3 (Svelte 5), TypeScript, Tailwind CSS 4
- **API & Runtime:** Elysia 2, Eden Treaty, Cloudflare Workers
- **Tooling:** Bun 1.4.4, Vitest, Oxlint, Oxfmt

## Quick Start

Prasyarat: [Bun](https://bun.sh/) `1.4.4`.

```bash
git clone <repo-url>
cd ubetools
bun install
bun run dev
```
