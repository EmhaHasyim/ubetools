# Design: Suno Music Downloader

## Intent

Pengguna menyalin link Suno dari tiga bentuk — satu lagu, beberapa lagu, atau playlist — lalu ingin file musiknya langsung tersimpan di perangkatnya. Mode harus terdeteksi dari isi yang ditempel. Untuk batch dan playlist, hasilnya satu arsip ZIP. Metadata tidak ditampilkan sama sekali: hanya daftar file/format dan tombol unduh yang bersih.

## Goals

- Satu textarea menerima satu link lagu, banyak link lagu (maksimal 50), atau satu link playlist.
- Mode **single / batch / playlist** terdeteksi otomatis dari isi input; input yang tidak cocok dengan salah satu pola ditolak.
- Pilihan format menampilkan format yang benar-benar bisa diambil dari Suno tanpa login, konversi, atau akun: **M4A**.
- Single mengunduh satu file M4A; batch dan playlist mengunduh satu ZIP berisi file M4A bernomor.
- Tidak ada judul, cover, durasi, jumlah play, atau metadata lain di UI maupun nama file.

## Non-goals

- MP3, WAV, video, stems, dan MIDI: semuanya lewat endpoint Suno yang butuh akun/berlangganan atau konversi.
- Link Only/privat, cookie, API key Suno, atau login.
- Menyimpan audio, URL upstream, riwayat, atau metadata di Worker/KV/R2.
- Membuka file yang dienkripsi Suno atau memutar ulang proteksi lisensinya.
- Batas ukuran ZIP: pengguna memilih batas link 50; ukuran tidak dibatasi secara eksplisit.

## Constraints

- SvelteKit 3 + Svelte 5 runes, Elysia 2 RC, Eden Treaty; tanpa dependensi baru.
- Endpoint hanya ditambahkan di `src/lib/server/api/index.ts`; allowlist host ketat dan rate limiter 30 permintaan/menit/IP yang sama dengan tool lain.
- Semua URL upstream dibangun server-side dari ID tervalidasi, bukan URL dari user.
- Error `problem+json` Bahasa Indonesia; UI memakai token CSS yang ada.
- Fakta yang teramati 2026-11-20:
  - Halaman lagu publik dan `https://studio-api.prod.suno.com/api/clip/<uuid>` bisa dibaca tanpa login.
  - `media_urls` berisi file CloudFront `.m4a` dengan `content_type: "m4a-opus"` dan `encoding: "1.0.0"`. File ini bukan kontainer M4A biasa (tidak ada `moov`, raw Opus), jadi **tidak bisa** diberi nama `.m4a` untuk user.
  - `audio_url` pada halaman publik adalah `/api/forbidden`.
  - Endpoint `GET /api/download/clip/{id}?format=mp3|m4a|mp4` dan `GET|POST /api/gen/{id}/wav_file/|convert_wav` mengembalikan `401 Unauthorized` tanpa akun. MP3/WAV butuh sesi Suno atau konversi lokal.
  - `video_url` (`https://cdn1.suno.ai/<uuid>.mp4`) bisa diakses tanpa login dan berisi video/mp4; ini bukan format musik yang diminta pengguna, tetapi satu-satunya file lengkap yang terekspos publik selain M4A terenkripsi.
  - Suno JS punya konstanta `Mp3`, `M4aOpus`, `WebmOpus` untuk `content_type`, bukan daftar format unduhan bebas. Menu MP3/M4A/WAV/Render video/stems juga terlihat di bundle, tetapi MP3/WAV/stems butuh akun.

## Implementation approach

Dipilih: **satu endpoint, satu komponen, tiga mode, satu format publik**.

Alternatif yang ditolak:

- **Semua format Suno (MP3/M4A/WAV)**: melanggar batas tanpa login; MP3/WAV butuh endpoint privat atau konversi. Tidak bisa dijanjikan jujur dari Konten publik.
- **Dua endpoint (resolve + download)**: endpoint resolve tambahan tidak diperlukan karena mode dan format sudah cukup ditentukan dari input; satu POST untuk menyiapkan file, satu GET untuk streaming seperti pola thumbnail.
- **Proxy sembunyi URL M4A terenkripsi sebagai `.m4a`**: file bukan M4A asli, akan rusak di pemutar pengguna.

Alur:

1. `src/lib/suno.ts` (baru):
   - `parseSunoRequest(input: string)` memecah input menjadi baris/koma/spasi, memvalidasi maksimal 50 URL, lalu mengklasifikasikan: satu `/song/<uuid>` → `single`, banyak `/song/<uuid>` → `batch`, satu `/playlist/<uuid>` → `playlist`. Campuran playlist + lagu, lebih dari satu playlist, atau `/s/<short-id>` ditolak. `/s/` ditolak karena 307 ke `/` dan bukan pengalih lagu yang bisa dipakai.
   - Host hanya `suno.com` dan `www.suno.com`, protokol `https:`, UUID versi 4 regex ketat. URL dibangun ulang menjadi `https://studio-api.prod.suno.com/api/clip/<uuid>` atau `https://studio-api.prod.suno.com/api/playlist/<uuid>/?page=1` dengan host/format tetap dari kode.
   - Response clip: `media_urls[]` dengan `content_type: "m4a-opus"`, `delivery: "progressive"`, `encoding` kosong/tidak ada. Response playlist: `playlist_clips[].clip` dengan bentuk sama; hanya halaman pertama yang diambil dan `num_total_results` dihapus dari daftar (batas 50 masih berlaku). Entri dengan `encoding` apa pun ditolak. Host media harus `cdn-o.suno.com` atau `*.cloudfront.net` dari metadata Suno; URL user tidak pernah dipakai langsung.
   - Nama file di ZIP hanya urutan (`01.m4a`, `02.m4a`, ...) — tanpa judul atau ID.
2. `src/lib/server/api/index.ts`:
   - `POST /api/tools/suno-music` dengan body `{ input: string }`, validation 400, 429, 404, 502 `problem+json`.
   - Untuk tiap target, fetch API publik Suno server-side dengan timeout 8 detik. Untuk playlist, ambil item dari `playlist_clips[].clip` pada halaman pertama; batas 50 item tetap berlaku.
   - Batch/playlist: jika sebagian item gagal (terenkripsi, privat, 404), lewati item itu dan sertakan hanya yang berhasil; response `count` adalah jumlah file yang benar-benar ada di ZIP. Jika semua gagal, 502.
   - Response 200: single `{ downloadUrl: string, mode: 'single' }`, batch/playlist `{ downloadUrl: string, mode: 'batch'|'playlist', count: number }`. `downloadUrl` adalah URL internal `/api/tools/suno-music/download?token=...` berisi **media URL final yang sudah divalidasi** dan tipe `single`/`zip`, dikodekan base64url — tidak perlu worker secret, tidak menyimpan data, dan hanya host allowlisted yang boleh di-fetch saat download. Token bukan rahasia: siapa pun yang punya link unduh boleh memakainya, sama seperti URL unduh pada tool thumbnail. Endpoint GET membatasi panjang token dan mem-verifikasi host sebelum fetch.
   - `GET /api/tools/suno-music/download?token=...`: rate limit lalu stream file M4A langsung dari host allowlisted untuk single. Untuk batch/playlist, stream ZIP yang dibuat on-the-fly tanpa R2/disk dengan **fflate** (satu dependensi kecil, lazim untuk ZIP di Worker), satu entry per nomor urut. Tidak ada fetch Suno kedua kali.
   - Jika tidak ada satupun M4A yang bisa dipakai karena semua file terenkripsi, kembalikan 502 dengan pesan jujur: Suno tidak menyediakan file M4A publik untuk link itu.
   - Bila tidak ada secret binding: tidak ada secret yang diperlukan; token base64url bukan rahasia, jadi dev/test/CI/deploy memakai konfigurasi yang sama.
3. `src/lib/components/tools/SunoMusicTool.svelte` (baru):
   - Textarea, satu pilihan format `M4A` yang jelas "format publik tanpa konversi", dan label mode hasil deteksi (Single/Batch/Playlist). Tidak ada pemilih mode manual: parser menolak input yang tidak cocok dengan salah satu pola, jadi tidak ada mode ambigu yang perlu dipilih user.
   - Daftar hasil hanya menampilkan jumlah file dan tombol "Unduh M4A" / "Unduh ZIP", tanpa judul/cover/durasi.
   - Error memakai `detail` dari `problem+json`.
4. `src/routes/tools/[slug]/+page.svelte` dan `src/lib/tools.ts`:
   - Render komponen baru untuk `suno-music` dan ubah status menjadi `live`. Copy tool hanya di `tools.ts`, sesuai konvensi.
5. `README.md` dan `AGENTS.md`: status Suno berubah dari `soon` menjadi aktif dengan batas 50 link dan hanya M4A publik.

## Trade-off yang disadari

- Format tampak satu-satunya (M4A) meski pengguna meminta "format yang disediakan Suno". Keputusan ini dikonfirmasi pengguna setelah builder check: format menu lain butuh akun/konversi, dan tool ini tanpa login.
- Playlist 32 lagu yang teramati berisi file M4A terenkripsi, jadi dalam praktiknya playlist itu **akan ditolak** dengan pesan jujur, bukan dijadikan ZIP palsu. Mode batch/playlist tetap ada untuk link yang menyediakan M4A publik tidak terenkripsi.
- Membuat ZIP dari audio penuh berarti mengunduh semua file ke memori Worker sebelum dikirim; tanpa batas ukuran sesuai permintaan pengguna, ini berisiko memori untuk 50 lagu panjang. Ini akan ditandai dengan komentar `shortcut:` dan batas konkret di implementasi.
- Dependensi `fflate` baru; ini satu-satunya jalan membuat ZIP stream tanpa menulis ke storage dan tanpa boilerplate ZIP manual.

## Builder decisions

- Mode otomatis, bukan manual: keputusan desain karena semua input yang valid punya bentuk yang jelas; pengguna hanya perlu memilih format.
- Nama file minimal `01.m4a`, `02.m4a`: keputusan desain untuk menghapus metadata sesuai permintaan pengguna.
- Batas 50 link: keputusan pengguna, ukuran tidak dibatasi eksplisit.
- Deteksi otomatis tanpa opsi manual: keputusan desain karena input yang valid selalu cocok dengan salah satu pola; pertanyaan manual sebelumnya ditujukan untuk link yang tidak dikenali.
- `POST` untuk menyiapkan tautan dan `GET` untuk mengunduh: mengikuti pola thumbnail yang sudah ada di repo.
