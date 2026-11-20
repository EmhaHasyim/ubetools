# Design: YouTube Tag Extractor untuk video dan channel

## Intent

Pengguna punya satu kebutuhan: menyalin semua tag/keyword dari video atau channel YouTube publik. Tool saat ini masih `soon`; parser `parseWatchPageTags` sudah ada tetapi hanya untuk halaman video dan belum dipanggil UI/API mana pun.

## Goals

- Satu kolom input menerima link video ATAU channel YouTube publik.
- Endpoint mengembalikan daftar tag yang bisa disalin sekaligus lewat tombol "Salin semua".
- Tetap memakai pola thumbnail tool: allowlist host, rate limit per IP, `problem+json`, UI Bahasa Indonesia.

## Non-goals

- YouTube Data API / API key / secret.
- Video atau channel privat, terhapus, atau di balik consent wall.
- Tab terpisah, endpoint terpisah, opsi ekspor, atau penyimpanan riwayat.

## Constraints

- SvelteKit 3 + Svelte 5 runes, Elysia 2 RC, Eden Treaty; tidak ada dependensi baru.
- `src/lib/server/api/index.ts` adalah satu-satunya tempat endpoint baru.
- `src/lib/tools.ts` adalah satu-satunya sumber status/copy tool.
- Upstream URL harus dibangun dari bagian yang sudah divalidasi; URL user tidak pernah di-fetch langsung (SSRF).
- Tag channel YouTube hidup di `<meta name="keywords">` pada halaman channel, tetapi halaman channel tidak punya `playabilityStatus`. Contoh teramati: `https://www.youtube.com/@MrBeast` mengembalikan keywords `mrbeast6000, beast, mrbeast, Mr.Beast, mr` dan 404 untuk handle palsu.

## Implementation approach

Dipilih: **satu input, satu endpoint**. Alternatif dua tab/endpoint menambah duplikasi kode tanpa menambah hasil; YouTube Data API membutuhkan key dan kuota yang dilarang konvensi repo.

1. `src/lib/youtube-tags.ts`
   - Tambah `parseYouTubeTarget(url)` yang membedakan video/channel.
   - Video memakai `parseVideoId` yang sudah ada. Channel menerima `youtube.com` dengan `/@handle`, `/channel/UC...`, `/user/...`, `/c/...`, opsional `/about`; segmen divalidasi dengan regex lalu dipakai untuk membangun `https://www.youtube.com/...` dengan `encodeURIComponent`.
   - `parseWatchPageTags(html, mode)` menerima `mode: 'video' | 'channel'` (default `video`): mode video mengecek `playabilityStatus`, mode channel mengecek penanda halaman channel (`channelMetadataRenderer`); keduanya memakai parser keywords yang sudah ada (decode entity, trim, dedupe). Channel memisahkan keyword pada koma dan spasi karena YouTube menghasilkan keyword channel dalam format spasi; video tetap memakai koma. Halaman yang tidak dikenal tetap `blocked`, bukan diam-diam dilaporkan sebagai `hidden`.
2. `src/lib/server/api/index.ts`
   - `POST /api/tools/youtube-tags` dengan body `{ url: string }`, memakai `rateLimiter` yang sama dengan thumbnail (satu kuota 30 req/menit per IP untuk seluruh API, sesuai pola yang sudah ada).
   - Untuk video fetch `https://www.youtube.com/watch?v=<id>`; untuk channel fetch URL channel yang sudah dibangun server.
   - Response 200: `{ kind: 'video' | 'channel', state: 'ok' | 'hidden', tags: string[] }`.
   - 400 untuk link yang tidak dikenal, 404 untuk konten tidak ditemukan/`unavailable`, 502 untuk kegagalan upstream/`blocked`, 429 untuk rate limit. UI cukup membaca `detail` dari `problem+json` untuk kasus error.
3. `src/lib/components/tools/YoutubeTagsTool.svelte` (baru)
   - Form satu input, tombol "Ambil tag", daftar tag sebagai chip, tombol "Salin semua" yang menggabungkan tag dengan `, ` lewat `navigator.clipboard`.
   - Pesan jelas untuk `hidden`, `unavailable`, `blocked`, dan error jaringan.
4. `src/routes/tools/[slug]/+page.svelte`
   - Render komponen baru untuk `data.tool.slug === 'youtube-tags'`; placeholder "Segera" tetap untuk Suno.
5. `src/lib/tools.ts`
   - Status `youtube-tags` menjadi `live`; copy dan placeholder menyebut video dan channel.
6. Dokumentasi: `README.md` dan `AGENTS.md` mengikuti status/cakupan baru.
7. Test: parser target channel + parser mode channel; endpoint dengan fetch palsu untuk video, channel, hidden, dan link invalid. Gate `bun run verify` diperbaiki dengan menjalankan `bunx --bun oxfmt src/lib/youtube-tags.spec.ts` (satu baris terlalu panjang di baris 11; temuan audit `REPORT-AUDIT.md`).

## Factors the builder decides

- Nama state/chip dan gaya visual mengikuti kelas yang sudah ada di `src/routes/layout.css`; tidak ada token warna baru.
- Teks error memakai kalimat Bahasa Indonesia yang sederhana dan konsisten dengan endpoint thumbnail.
- Tidak ada test khusus untuk tombol clipboard; logika baru yang diuji ada di parser dan endpoint.
