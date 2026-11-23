# Thumbnail input size and single best result

## Intent

User asked: the YouTube thumbnail URL input looks small, and download should offer only the best quality, with no other options. Clarified choices: enlarge the input only ("Perbesar saja"), and show exactly one result ("Satu hasil saja"), with fallback when `maxresdefault` is unavailable.

## Goals / non-goals / anti-goals

- Goal: input bar height 52px; one thumbnail result using the highest available variant; one download button; copy/open actions kept.
- Non-goal: changing Suno/tag tools or adding new download options.
- Anti-goal: extra cards, comparison grid, or a separate quality selector.

## Constraints

- DESIGN.md says primary tool input height 44px; user explicitly wants it larger. This spec overrides to 52px for `.command-bar` only.
- API already probes all variants in resolution order and returns available ones, so fallback needs no new network logic.
- `tools.ts` is the single source of truth for copy; update capability text there.

## Implementation options

1. Client-only filter (recommended): keep API response unchanged, render `thumbnails[0]` and hide the grid. Smallest diff, preserves API contract, but the API still probes all variants.
2. API response change: return a single thumbnail object. Cleaner contract but touches server, Eden types, tests, and callers for a UI-only request.
3. Fixed maxresdefault URL without probing: fastest but breaks videos without maxres. Rejected — user accepted fallback.

Chosen: option 1.

## Design

- `src/routes/layout.css`: `.command-bar input` and `.command-bar .btn-primary` height `3.25rem` (52px), font size `0.9375rem` for input.
- `DESIGN.md`: input/tool command bar height becomes 52px, primary buttons 44px inside 52px bars; document why.
- `src/lib/components/tools/YoutubeThumbnailTool.svelte`: use `result.thumbnails[0]`, render one card, one `Unduh` link with its variant, keep `Salin URL` and `Buka`; empty/hint copy mentions highest available resolution, not all sizes.
- `src/lib/tools.ts`: capability "Menampilkan semua ukuran thumbnail yang tersedia." → "Memilih otomatis ukuran thumbnail terbaik yang tersedia."
- No API or test changes expected; verify gates catch type/schema drift.
