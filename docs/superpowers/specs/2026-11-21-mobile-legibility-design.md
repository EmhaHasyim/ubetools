# Mobile legibility — design

Date: 2026-11-21
User request: "saya rasa tetap terlalu kecil di mobile. perhatikan semua detail kecilnya jangan ada yang terlewat"
Chosen option: all text and touch targets (user selected "Semua teks + target (Recommended)").

## Goal

Make every visible text and interactive target comfortably readable/tappable on a 390px-wide phone, without changing desktop design semantics or tool logic.

## Root cause

- The thumbnail URL input measured only **22px tall** on mobile despite `height: 3.25rem`: `.command-bar input { flex: 1 }` in a column flex container sets `flex-basis: 0%`, overriding the height. The visible 52px bar was the submit button; the input above it was a thin strip. Fix: `flex: none` on mobile inputs/textarea.
- The URL input font was 15px. iOS Safari zooms any focused input with font-size <16px.
- Many secondary texts were 12px (`text-xs`, `.label-mono`, `.badge`, `.search-kbd`, breadcrumbs, hints, status, footer wrapper) or 13px (`.nav-link`, `.footer-link`, `.filter-chip`, buttons).
- Several targets were 36–40px (`.icon-btn`, `.nav-link`, `.filter-chip`, `.btn-primary`, `.btn-secondary`).

## Approach

One mobile-only block at the end of `src/routes/layout.css` (`@media (max-width: 639px)`). Tailwind utilities live in a layer; our unlayered CSS already wins the cascade, so this is a small, explicit override rather than a new framework. Desktop keeps the current DESIGN.md scale.

### Mobile sizes

| Element                                | Current        | Mobile target         | Desktop stays |
| -------------------------------------- | -------------- | --------------------- | ------------- |
| Input / textarea font                  | 15px           | 16px (stops iOS zoom) | 15px          |
| Command bar height                     | 52px           | 56px                  | 52px          |
| Search box height                      | 44px           | 52px                  | 44px          |
| Primary / secondary button             | 40px / 13–14px | 44px / 15px           | 40px / 13px   |
| Nav link, icon button, filter chip     | 36px / 13px    | 44px / 14px           | 36px / 13px   |
| `text-xs` content                      | 12px           | 14px                  | 12px          |
| `text-sm` content                      | 14px           | 15px                  | 14px          |
| `text-[15px]` body copy                | 15px           | 16px                  | 15px          |
| `.label-mono`, `.badge`, `.search-kbd` | 12px           | 14px                  | 12px          |
| Footer link                            | 13px           | 14px                  | 13px          |

Headings (18/24px), spacing, colors and layout grids do not change.

## Files

- `src/routes/layout.css` — the mobile override block; no new tokens.
- `src/lib/components/Header.svelte` — wordmark `text-base sm:text-[0.9375rem]`.
- `src/routes/+page.svelte` — "Semua tool" link, FAQ summary/answer text.
- `src/routes/tools/+page.svelte` — intro, empty state.
- `src/routes/tools/[slug]/+page.svelte` — hint and note copy.
- `src/routes/+error.svelte` — error copy.
- `src/lib/components/tools/YoutubeThumbnailTool.svelte`, `YoutubeTagsTool.svelte`, `SunoMusicTool.svelte` — empty-state copy, remove inline 13px button font overrides so shared CSS controls it.
- `DESIGN.md` — document mobile sizes; fix stale "Thumbnail result grid: responsive 2 columns on desktop" (UI now shows one best thumbnail).
- `docs/superpowers/specs/2026-11-21-mobile-legibility-design.md` — this design.

No API, API tests, tool registry or logic change.

## Verification

1. `bun run verify` green.
2. Chrome DevTools at 390x844: `/`, `/tools`, `/tools/youtube-thumbnail`, `/tools/youtube-tags`, `/tools/suno-music`, light and dark; check no overflow and no visible text below 14px.
3. Inspect computed styles: command input font-size 16px, command bar 56px, buttons/nav/chips >=44px.
4. Mock the thumbnail API response to check the result card's small text and buttons.
5. `bun run deploy`, then live HTTP smoke test on all routes.

## Risks

- Larger text can wrap chips or buttons; visual check catches it.
- If a utility class is re-ordered, the override could stop applying; computed-style check catches it.
