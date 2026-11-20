# Suno Music Downloader Implementation Plan

> **Worker agent for this project:** Required subskill: use executing-plans to implement this plan task by task. Steps use checkboxes (`- [ ]`).

**Goal:** Let users paste one song, many songs, or a playlist from Suno and download the public M4A audio directly (single) or as a ZIP (batch/playlist), with no metadata or account.

**Architecture:** A pure parser classifies input and extracts public media URLs; Elysia endpoints resolve them and stream files with an on-the-fly ZIP; a Svelte 5 component drives the UI and uses the existing Eden client.

**Stack:** SvelteKit 3 + Svelte 5 runes, Elysia 2 RC, Eden Treaty, TypeScript strict, Vitest, Bun 1.4.4, fflate for ZIP.

**Spec:** `docs/superpowers/specs/2026-11-20-suno-downloader-design.md` (read both before starting).

## Global constraints

- No account, cookies, or private content. Only public M4A audio that Suno actually serves without conversion.
- Max 50 song links; batch/playlist output is one ZIP with `01.m4a`, `02.m4a`, ... names only (no titles, covers, durations or IDs).
- Mode `single`/`batch`/`playlist` is auto-detected; malformed or mixed input is rejected with a 400 `problem+json` detail in Indonesian.
- Host allowlist only `suno.com`, `www.suno.com`, `cdn-o.suno.com`, `*.cloudfront.net`; build upstream URLs from validated IDs; never fetch a user-supplied URL.
- Apply the shared 30 requests/minute/IP limiter and existing 400/404/429/502 `problem+json` conventions.
- No new dependency except `fflate`; no Worker secrets, KV/R2, or saved state.
- Use `#lib/...` import specifiers with file extensions and Svelte 5 runes; tool copy lives only in `src/lib/tools.ts`; UI copy in Indonesian.
- `bun run verify` must exit 0 at the end; no git commits (not a git repo).

## Review focus

- 50 song links plus one fake ID: expectation is 400 before any network request, not a huge fan-out. Pin in Task 1 parse test.
- Playlist page containing 32 encrypted `m4a-opus` clips: expectation is a friendly 502 or a ZIP with zero real files, never a renamed Opus file. Pin in Task 1/2 tests.
- Direct GET download token pointing at a non-allowlisted host: expectation is 400, never an SSRF fetch. Pin in Task 2 download test.
- A song URL with `www`, query string, trailing slash, or uppercase host: expectation is normalized `suno.com/song/<uuid>` API URL. Pin in Task 1 parse test.
- Batch with one good and one encrypted song: expectation is a ZIP with exactly one correctly named file and `count: 1`. Pin in Task 2 API test.

---

### Task 1: Suno link parser and public audio resolver

**Files:**

- create `src/lib/suno.ts`
- create `src/lib/suno.spec.ts`

- [ ] **Step 1: Write failing tests for parsing and resolution**

In `src/lib/suno.spec.ts`, import `parseSunoRequest`, `parseSunoMedia`, `resolveSunoTargets` from `./suno.ts`. Use Vitest `describe/test/expect` and `vi.stubGlobal('fetch', ...)` for the async tests. Cover exactly these assertions:

- `parseSunoRequest('https://suno.com/song/11111111-1111-4111-8111-111111111111')` → `{ mode: 'single', ids: ['11111111-1111-4111-8111-111111111111'] }`.
- `parseSunoRequest('https://www.suno.com/song/11111111-1111-4111-8111-111111111111?x=1\nhttps://suno.com/song/22222222-2222-4222-8222-222222222222')` → `mode: 'batch'` with the two IDs in order.
- `parseSunoRequest('https://suno.com/playlist/33333333-3333-4333-8333-333333333333')` → `{ mode: 'playlist', ids: ['33333333-3333-4333-8333-333333333333'] }`.
- `parseSunoRequest` rejects: non-HTTPS, non-Suno host, `suno.com.evil.test`, `/s/<id>`, malformed UUID, mixed playlist+song, two playlists, more than 50 songs, and empty input — each returns `null`.
- `parseSunoMedia({ status: 200, ok: true, json: async () => ({ media_urls: [{ url: 'https://cdn-o.suno.com/audio.m4a', content_type: 'm4a-opus', delivery: 'progressive' }] }) })` resolves to `{ url: 'https://cdn-o.suno.com/audio.m4a' }`; a response with `encoding: '1.0.0'`, `content_type: 'mp3'`, a non-CloudFront host, or an HTTP error resolves to `null`.
- `resolveSunoTargets` with stubbed `fetch`: for a playlist response `{ playlist_clips: [{ clip: { media_urls: [<valid m4a>] } }, { clip: { media_urls: [<encrypted m4a>] } }] }` returns one `{ url, index: 0 }` (encrypted skipped); for a clip response `{ media_urls: [<valid m4a>] }` returns one entry. Stubbed `fetch` rejects → returns `[]`. Assert the called URL equals `https://studio-api.prod.suno.com/api/playlist/<uuid>/?page=1` or `https://studio-api.prod.suno.com/api/clip/<uuid>`; no other host is called.

- [ ] **Step 2: Run the tests and confirm failure**

Run `bun run test src/lib/suno.spec.ts`; expected FAIL because `./suno.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/suno.ts`**

Export these exact signatures (bodies are yours):

- `export type SunoMode = 'single' | 'batch' | 'playlist'`
- `export type SunoRequest = { mode: SunoMode; ids: string[] }`
- `export type SunoMedia = { url: string }`
- `export type SunoTarget = { url: string; index: number }`
- `export function parseSunoRequest(input: string): SunoRequest | null`
- `export async function parseSunoMedia(response: Response): Promise<SunoMedia | null>`
- `export async function resolveSunoTargets(request: SunoRequest): Promise<SunoTarget[]>`

Implementation details that are already decided: split input on newlines/commas/spaces, accept only `https:` and host `suno.com`/`www.suno.com`, UUID regex `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive), paths `/song/<uuid>` and `/playlist/<uuid>` only; one song = `single`, 2–50 songs = `batch`, exactly one playlist = `playlist`; anything mixed or >50 = `null`. `parseSunoMedia` reads JSON, requires `media_urls` array entries with `content_type === 'm4a-opus'`, `delivery === 'progressive'`, no `encoding` property or empty string, and URL host `cdn-o.suno.com` or ending `.cloudfront.net`; returns the first match. `resolveSunoTargets` builds `https://studio-api.prod.suno.com/api/clip/<id>` for song IDs and `https://studio-api.prod.suno.com/api/playlist/<id>/?page=1` for playlists, uses `fetch` with `AbortSignal.timeout(8_000)`, skips failed/unusable entries, and preserves the original song index. For playlists, read `playlist_clips[].clip.media_urls`. No URL from the user is ever fetched. Keep the module pure except for the injected/global `fetch` in `resolveSunoTargets`.

- [ ] **Step 4: Run the parser tests**

Run `bun run test src/lib/suno.spec.ts`; expected PASS.

- [ ] **Step 5: Typecheck**

Run `bun run check`; expected 0 errors and 0 warnings.

---

### Task 2: Suno API endpoints and download token

**Files:**

- modify `src/lib/server/api/index.ts`
- create `src/lib/server/api/suno-download.spec.ts` (black-box tests against `app.handle(new Request(...))`)

- [ ] **Step 1: Write failing endpoint tests**

In `src/lib/server/api/suno-download.spec.ts`, use `vi.stubGlobal('fetch', ...)`, call `app.handle()` with `Request` objects, and assert status codes and JSON bodies. Cover:

- `POST /api/tools/suno-music` with a malformed `input` returns 400 with `detail` containing `Link Suno tidak valid`.
- Valid single input with stubbed clip JSON returns 200 `{ downloadUrl: '/api/tools/suno-music/download?token=...', mode: 'single' }` and no `filename` field.
- Batch input with one valid and one encrypted clip returns 200 `{ mode: 'batch', count: 1 }`; a batch where all clips are encrypted returns 502 with `detail` mentioning `M4A publik`.
- `GET /api/tools/suno-music/download?token=<base64url>` for a single valid `cdn-o.suno.com` URL returns 200 with `Content-Type: audio/mp4` and an attachment `Content-Disposition`.
- A hand-made token whose JSON points at `https://evil.test/x.m4a` returns 400 and stubbed `fetch` was never called.
- A GET download request with no token returns 400.

- [ ] **Step 2: Confirm the tests fail**

Run `bun run test src/lib/server/api/suno-download.spec.ts`; expected FAIL (`404` for the unknown routes).

- [ ] **Step 3: Install `fflate` and implement the routes**

Run `bun add fflate` (Bun only). In `src/lib/server/api/index.ts`, import `zipSync` from `fflate`, `apiProblem`, `checkQuota` usage, and the three functions/types from `#lib/suno.ts`. Add:

- `POST /api/tools/suno-music` with body `t.Object({ input: t.String({ minLength: 1, maxLength: 5000 }) })`, declared 200/400/404/429/502 responses. It calls `checkQuota`, `parseSunoRequest` (400 on null), `resolveSunoTargets` (502 on empty), then returns `{ downloadUrl, mode, count? }`. `downloadUrl` is `/api/tools/suno-music/download?token=` + base64url of JSON `{ files: [{ url, name: '01.m4a' }], zip: boolean }`. Single means one file; batch/playlist means a ZIP and includes `count`.
- `GET /api/tools/suno-music/download` with query `t.Object({ token: t.String({ minLength: 1, maxLength: 16000 }) })`. It calls `checkQuota`, decodes and JSON-parses the token inside `try/catch`, validates every file URL's host against the allowlist from Task 1 (reuse a small exported helper from `#lib/suno.ts` rather than duplicating the check), fetches files with 8s timeout, and returns either the single audio response or a ZIP response. For the ZIP, fetch sequentially, `zipSync({ '01.m4a': Uint8Array, ... }, { level: 0 })` from the already-fetched `arrayBuffer()` results, and return with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="suno-music.zip"`. Add one `shortcut:` comment naming the memory ceiling (all ZIP audio buffered in memory; upgrade to a streaming ZIP library if >50-link memory becomes a problem).
- Use `apiProblem(400, 'invalid-request', 'Permintaan tidak valid', ...)` with an Indonesian `detail` containing the literal `Link Suno tidak valid` for parse/token errors, and 502 with `M4A publik` for missing audio.

- [ ] **Step 4: Run the endpoint tests**

Run `bun run test src/lib/server/api/suno-download.spec.ts`; expected PASS.

- [ ] **Step 5: Check and lint**

Run `bun run check && bun run lint`; expected 0 errors, 0 warnings, and no lint findings.

---

### Task 3: UI wiring and project status

**Files:**

- create `src/lib/components/tools/SunoMusicTool.svelte`
- modify `src/routes/tools/[slug]/+page.svelte`
- modify `src/lib/tools.ts`
- modify `README.md`
- modify `AGENTS.md`

- [ ] **Step 1: Write a component smoke test**

Create `src/lib/components/tools/SunoMusicTool.spec.ts` using Vitest's node environment: assert the component source exports no rune-independent logic beyond `eden`, that `src/lib/tools.ts` marks `suno-music` as `status: 'live'`, and that the tool page render branch imports `SunoMusicTool.svelte`. This is a guard, not a browser test: read files with `import { readFileSync } from 'node:fs'`, resolve from `process.cwd()`. Expected FAIL before implementation.

- [ ] **Step 2: Confirm failure**

Run `bun run test src/lib/components/tools/SunoMusicTool.spec.ts`; expected FAIL.

- [ ] **Step 3: Implement the component and wiring**

Create `src/lib/components/tools/SunoMusicTool.svelte` following `YoutubeTagsTool.svelte`'s patterns: `eden` from `#lib/client/client.ts`, `$state` for `input`, `loading`, `errorMessage`, `result`, `$derived` for the submit label, `onSubmit` calling `eden.api.tools['suno-music'].post({ input })`, `response.error.value.detail` for errors, and a normal `<a class="btn-primary" href={result.downloadUrl} download>` for the file. Render only mode (Single/Batch/Playlist), count for ZIP, and the download button — no titles, covers, durations or IDs. Show a hint that one song, many songs, or a playlist is accepted, max 50 links, public M4A only. Use `class="command-bar mt-8"` for the form, a `<textarea>` with `id="suno-input"` and `sr-only` label, and a `<div class="empty-state mt-6">` placeholder.

Modify `src/routes/tools/[slug]/+page.svelte`: import `SunoMusicTool` and add `{:else if data.tool.slug === 'suno-music'}` before the final `{:else}` to render it.

Modify `src/lib/tools.ts`: set `suno-music.status` to `'live'`, update `tagline`, `description`, `placeholder`, and `capabilities` to describe no-conversion public M4A, auto-detected modes, and ZIP output — never mention metadata, titles, covers or durations.

Modify `README.md` and `AGENTS.md`: change the Suno entry from planned/soon to live with this exact scope: public M4A only, up to 50 links, no account, no storage.

- [ ] **Step 4: Run the component test and full verification**

Run `bun run test src/lib/components/tools/SunoMusicTool.spec.ts` then `bun run verify`; expected all PASS and verify exit 0.

---

## Final check

- [ ] Open `/tools/suno-music` in a dev server and paste one real public song link; confirm the UI shows the detected mode and a working M4A download button.
- [ ] Confirm the repo contains no saved Suno audio, upstream URL, token, or personal data.
