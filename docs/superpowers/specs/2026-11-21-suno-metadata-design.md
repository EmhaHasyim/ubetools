# Suno metadata in the download preview

- Date: 2026-11-21
- Request: after "Siapkan unduhan", show useful public Suno information, not only title and duration (m01102, m01152).
- Input field needs no change: the mode-aware textarea is correct after the mobile legibility fix.

## Why

`src/lib/suno.ts` currently keeps only `{ url, id, encrypted }` from Suno's public clip
response, and `POST /api/tools/suno-music` returns only `{ downloadUrl, mode, skipped? }`.
The UI therefore shows a download button with no way to confirm what was matched.

Live probes confirmed the upstream response already exposes:
`title`, `display_name`, `metadata.duration`, `major_model_version`, `display_tags`,
`created_at`, `status`, `play_count`, `image_url`, and playlist `name`, `song_count`,
`user_display_name`.

## Options

1. **Compact complete set (recommended)** — per track: title, artist, duration, model version,
   up to 3 tags, release date. Playlist: name, owner, track count and total duration. Always
   show `M4A · Opus` and skipped count. No cover art, no full prompt/lyrics.
2. **Everything upstream offers** — adds cover art and the full prompt/lyrics. Cover art requires
   a CSP change in `static/_headers` for `cdn2.suno.ai` and CloudFront image hosts; prompts are
   long lyrics, which makes 50-track batches hard to scan.
3. **Minimum** — title, artist, duration and track count only. Smallest diff, but leaves the user
   unable to check version or genre before downloading.

## Chosen approach

Option 1. Public metadata is read server-side from the same Suno response already fetched for
the M4A URL; no extra upstream request. The download token and streamed file stay unchanged —
no ID3 or embedded metadata is written.

## Changes

- `src/lib/suno.ts`: extend `SunoMedia` with optional `title`, `artist`, `duration`, `version`,
  `tags`, `createdAt`; extract them from the decoded clip object. Keep `parseSunoMedia` as a thin
  wrapper so existing callers/tests still work; decode each upstream response once in
  `resolveOne` and pass the object to a shared `parseSunoClip` helper. Add playlist summary
  (`name`, `owner`, `songCount`) to `SunoResolution`.
- `src/lib/server/api/index.ts`: extend the 200 response schema with `tracks` (id, title, artist,
  duration, version, tags, createdAt, format) and optional playlist `name`, `owner`, `songCount`;
  map from `resolveSunoTargets` instead of hardcoding in the client.
- `src/lib/components/tools/SunoMusicTool.svelte`: show a compact track list before the download
  button with `01. Title`, `Artist · m:ss · v5 · tags`, a playlist summary line, skipped count and
  total duration. Cap list height with scroll for 50 tracks; keep mobile font sizes at 14–16px.
- `src/lib/tools.ts` and the component's empty state: replace "tanpa metadata tambahan" with copy
  that distinguishes _displayed public info_ from _a plain M4A file with no embedded tags_.
- Tests: extend `src/lib/suno.spec.ts` for metadata extraction and playlist summary; extend
  `src/lib/components/tools/SunoMusicTool.spec.ts` for the new copy/render expectations.

## Out of scope

- No change to the textarea, mode cards, parsing rules, download endpoint, or ZIP contents.
- No cover art (CSP change), prompt/lyrics, play counts, or upstream URLs exposed to the client.
- No new dependency.

## Verification

`bun run verify`, then browser check at 392px in light/dark mode with a mocked Suno result,
then deploy and smoke-test live routes.
