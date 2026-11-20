# Audit status tool ubeTools

> **SUPERSEDED — 2026-11-20.** Ini snapshot sebelum rilis Tag Extractor. Temuan 1, 2, 3, 5, dan 6 sudah diperbaiki; Tag Extractor kini `live` dengan `POST /api/tools/youtube-tags` dan komponen aktif. Temuan 4 dan 7 masih relevan; temuan 8 hanya tersisa untuk Suno. Jangan pakai tabel status di bawah sebagai acuan.

Ditujukan ke pemilik repo. Lingkup: seluruh repo, dengan fokus pada tiga halaman tool dan jalur API-nya. Beban yang diasumsikan: pengguna web publik di belakang Cloudflare, tiap rute API dibatasi 30 permintaan per menit per IP (`src/lib/server/rate-limit.ts:32-37`).

## Ringkasan status

| Tool                         | Status di registry | UI                                        | API                                                                              | Hasil pengecekan                                                                                                            |
| ---------------------------- | ------------------ | ----------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| YouTube Thumbnail Downloader | `live`             | form aktif                                | `POST /api/tools/youtube-thumbnail`, `GET /api/tools/youtube-thumbnail/download` | Berfungsi. Halaman 200, health 200, resolusi 200 dengan 5 varian, download 200 `image/jpeg` 21.011 byte dari `i.ytimg.com`. |
| YouTube Tag Extractor        | `soon`             | input dan tombol disabled, badge "Segera" | tidak ada                                                                        | Belum berfungsi sebagai tool. Parser `parseWatchPageTags` sudah ada dan teruji, tapi tidak dipanggil halaman/API mana pun.  |
| Suno Music Downloader        | `soon`             | input dan tombol disabled, badge "Segera" | tidak ada                                                                        | Belum berfungsi. Hanya halaman placeholder dan copy di registry.                                                            |

Ini sesuai dengan `AGENTS.md` ("Thumbnail dan health live; dua tool masih soon"), tetapi tidak sesuai dengan `README.md` yang masih mencantumkan ketiganya sebagai "Segera".

## Must fix

Belum ada temuan `must fix` pada alur yang memang sudah dirilis.

## Should fix

### 1. `bun run verify` gagal karena format satu file

- **Apa itu:** `src/lib/youtube-tags.spec.ts:11` punya baris 107 karakter; oxfmt ingin memecahnya menjadi tiga baris.
- **Masalah:** `bun run verify` berhenti di `format:check` (exit 1). Gate CI tidak hijau meskipun `check`, `lint`, `test` (26/26), dan `build` lolos saat dijalankan terpisah.
- **Perbaikan:** jalankan `bunx --bun oxfmt src/lib/youtube-tags.spec.ts` — satu file, tanpa perubahan logika.
- **Kalau dilewati:** `bun run verify` dan CI selalu merah; orang yang mengandalkan gate tidak bisa membedakan format dari bug nyata.

### 2. README salah menyebut status tiga tool

- **Apa itu:** tabel di `README.md:7-11` menandai Thumbnail sebagai "Segera", padahal `src/lib/tools.ts:26` sudah `status: 'live'`.
- **Masalah:** pengunjung/repo reader mengira tool yang sudah aktif belum tersedia.
- **Perbaikan:** ubah baris Thumbnail di tabel menjadi "Aktif", dan arahkan ke `/tools/youtube-thumbnail`.
- **Kalau dilewati:** dokumentasi bertentangan dengan UI dan API yang sudah live.

### 3. Parser tag YouTube tidak punya pemanggil

- **Apa itu:** `src/lib/youtube-tags.ts:41` dan enam test di `src/lib/youtube-tags.spec.ts` sudah siap, tetapi `ffgrep` hanya menemukan keduanya; tidak ada endpoint atau komponen yang memakainya.
- **Masalah:** pekerjaan parser tersimpan tapi tidak menghasilkan fitur; status tool tetap `soon`.
- **Perbaikan:** jika Tag Extractor memang ingin diaktifkan, tambahkan endpoint `/api/tools/youtube-tags` di `src/lib/server/api/index.ts` dan komponen tool seperti `YoutubeThumbnailTool.svelte`, lalu ubah status di `src/lib/tools.ts`. Jika tidak, biarkan sebagai `soon` dan hapus parser/test sampai dipakai.
- **Kalau dilewati:** tidak ada perubahan fungsi; dua file itu tetap kode mati.

### 4. Rate limit tidak benar-benar per-IP di luar Cloudflare

- **Apa itu:** `src/lib/server/rate-limit.ts:43` membaca `cf-connecting-ip`, lalu jatuh ke bucket `'unknown'` untuk semua request tanpa header itu (misalnya akses langsung ke origin atau lokal).
- **Masalah:** semua pelanggan di luar jalur Cloudflare berbagi kuota 30 req/menit yang sama; satu klien bisa mem-blokir semua klien lain.
- **Perbaikan:** di Elysia `onBeforeHandle`, tolak atau batasi request tanpa `cf-connecting-ip` di lingkungan production, atau pakai alamat IP dari platform (`request.cf`/header yang dijamin proxy) dengan fallback per-request yang jelas. Ini menyentuh endpoint yang sudah live, jadi perlu test.
- **Kalau dilewati:** serangan satu arah bisa membuat tool live terasa mati untuk orang yang lewat origin langsung.

### 5. Download endpoint mengembalikan `Content-Type: image/jpeg` sebelum memeriksa upstream

- **Apa itu:** `src/lib/server/api/index.ts:184-193` menetapkan `image/jpeg` untuk setiap body sukses dari `i.ytimg.com`.
- **Masalah:** file thumbnail memang JPEG hari ini, tapi bila upstream mengirim format lain, browser tetap menyimpannya sebagai `.jpg`; pengguna mendapat file dengan ekstensi yang tidak cocok.
- **Perbaikan:** teruskan `upstream.headers.get('content-type') ?? 'image/jpeg'` dan turunkan ekstensi file dari tipe itu, atau validasi bahwa tipe diawali `image/jpeg` sebelum streaming.
- **Kalau dilewati:** risiko kecil, hanya bila YouTube mengubah format thumbnail.

## Nice to have

### 6. `_headers` dan CSP belum sinkron dengan dependensi font

- **Apa itu:** `src/app.html` dan `src/routes/layout.css:2-4` memakai Inter dan JetBrains Mono; `_headers:7` mengizinkan Google Fonts, tetapi tidak ada tag `<link>` ke Google Fonts di `src/app.html`.
- **Masalah:** aturan CSP membuka domain yang tidak dipakai; font jatuh ke `system-ui`/monospace lokal.
- **Perbaikan:** hapus pengecualian Google Fonts dari CSP bila memang tidak ingin memuat font itu, atau tambahkan link font bila desain mengharuskannya.
- **Kalau dilewati:** tidak merusak fungsi, hanya kebijakan CSP lebih longgar dari kebutuhan.

### 7. Build memunculkan 12 peringatan sourcemap dari plugin Elysia AOT

- **Apa itu:** `bun run build` exit 0, tetapi Rolldown mencetak `[SOURCEMAP_BROKEN]` untuk `elysia-aot` berkali-kali.
- **Masalah:** sourcemap produksi untuk bundle server tidak akurat, sehingga debugging stack trace di Worker lebih sulit.
- **Perbaikan:** cek opsi sourcemap pada `aot(...)` di `vite.config.ts:11-18`; kalau tidak diperbaiki, setidaknya dokumenkan sebagai batas yang dikenal di `vite.config.ts`.
- **Kalau dilewati:** build tetap jalan; hanya jejak error di produksi yang kurang bisa dipetakan.

### 8. Beberapa teks UI masih mengklaim fitur yang belum ada

- **Apa itu:** `src/routes/+page.svelte:35` dan `src/routes/tools/+page.svelte:38-41` menjanjikan "ekstrak tag" dan "audio Suno", sementara keduanya hanya placeholder; `src/routes/tools/+page.svelte:56` juga memakai kata "sedang dibangun".
- **Masalah:** kesan pertama pengunjung bisa mengira ketiga tool bisa dipakai.
- **Perbaikan:** sesuaikan copy dengan status registry, atau gunakan label `soon` yang sudah ada di `ToolCard.svelte`.
- **Kalau dilewati:** pengunjung perlu membuka halaman tool untuk mengetahui bahwa input disabled.

## Verdict

Satu tool benar-benar berfungsi: **YouTube Thumbnail Downloader** (`live`). Dua tool lain memang belum berfungsi dan memang berstatus `soon`. Perbaiki temuan 1 dan 2 dulu: gate verify dan README. Lanjutkan ke temuan 3 hanya jika Tag Extractor memang mau dirilis sekarang.

Lean: -2 file bisa dihapus bila Tag Extractor dibatalkan (`src/lib/youtube-tags.ts` dan `src/lib/youtube-tags.spec.ts`), -6 baris di README/CSP bila copy dan aturan font dirapikan.

Not checked: deployment production di Cloudflare (hanya build, dev server, dan API lokal yang diuji); interaksi browser sungguhan karena biner `agent-browser` tidak tersedia di PATH; perilaku rate limiter lintar-isolate memang sudah dibatasi dengan komentar `shortcut` di `src/lib/server/rate-limit.ts:41-42`.
