# AGENTS.md

## Project Overview

ubeTools is a web toolset: one page route per tool plus one API endpoint. Current tools: YouTube
Thumbnail Downloader, YouTube Tag Extractor, Suno Music Downloader. All three tools and
`GET /api/health` are live.

Stack: SvelteKit 3 (Svelte 5 runes) + TypeScript strict, Elysia 2 RC on Cloudflare Workers, Eden
Treaty client, Tailwind CSS 4, Vitest, Oxlint/Oxfmt, Bun 1.4.4. Single package, not a monorepo.

Working style: Ponytail ultra — smallest complete change, no unrequested features. Full rules live
in `.agents/skills/ponytail/SKILL.md`.

## Commands

Run from the repo root with Bun. Never use npm/pnpm/yarn/npx.

| Task                | Command                                      |
| ------------------- | -------------------------------------------- |
| Install             | `bun install`                                |
| Install (CI)        | `bun install --frozen-lockfile`              |
| Dev server          | `bun run dev`                                |
| Build (Worker)      | `bun run build`                              |
| Preview build       | `bun run preview`                            |
| Deploy              | `bun run deploy`                             |
| Lint                | `bun run lint`                               |
| Typecheck           | `bun run check`                              |
| Format              | `bun run format`                             |
| Format check        | `bun run format:check`                       |
| All tests           | `bun run test`                               |
| Single test file    | `bun run test src/lib/client/client.spec.ts` |
| Single test by name | `bun run test -t "calls GET /api/health"`    |
| Regenerate types    | `bun run gen`                                |
| Full gate           | `bun run verify`                             |

`bun run verify` chains `gen → check → lint → format:check → test → build`; it must exit 0.

## Architecture

- `src/routes/+layout.svelte` — app shell: skip link, Header, `<main id="main">`, Footer.
- `src/routes/+page.svelte` — landing: hero, tool grid, FAQ.
- `src/routes/tools/+page.svelte` + `+page.js` — directory; search/category filter is client-side,
  the `q` query param is read from `page.url`.
- `src/routes/tools/[slug]/+page.ts` + `+page.svelte` — detail page; `entries()` prerenders every
  slug from the registry, so adding a registry entry creates its page.
- `src/lib/tools.ts` — single source of truth for tool name, slug, copy, category, status and
  capabilities.
- `src/lib/components/` — Header, Footer, ToolCard, ToolIcon.
- `src/lib/server/api/index.ts` — the only place to add API routes (Elysia, prefix `/api`).
- `src/routes/api/[...slugs]/+server.ts` — catch-all forwarder; do not edit.
- `src/lib/client/client.ts` — Eden Treaty client bound to `App`; types flow from the server.
- Tests are colocated (`*.spec.ts` next to the module), Vitest with the node environment.
- Prerendered: `/`, `/tools`, every `/tools/[slug]`. The API stays dynamic.
- State: Svelte 5 runes; theme in `localStorage['ubetools-theme']`. No database, auth or persistence.
  Add Workers bindings (D1/R2) only when a tool actually needs them.
- `DESIGN.md` holds layout/color/type rules; `src/routes/layout.css` holds the tokens.
- Decided tool rules: thumbnail previews use official `i.ytimg.com` URLs at
  `maxresdefault`/`sddefault`/`hqdefault`/`mqdefault`/`default`; only
  `/api/tools/youtube-thumbnail/download` streams an attachment. Tags read public watch/channel-page
  metadata only; Suno exposes public M4A only (max 50 links, ZIP for batch/playlist) and never
  stores audio or upstream URLs. Endpoints get a per-IP rate limit; no auth or database. Endpoints
  live under `/api/tools/<slug>`: `/api/tools/youtube-thumbnail` (+ `/download`),
  `/api/tools/youtube-tags`, and `/api/tools/suno-music` (+ `/download`) are live.

## Coding Conventions

- Svelte 5 runes only: `$state`, `$derived`/`$derived.by`, `$props`; no stores.
- Import from `src/lib` through `#lib` with a file extension: `#lib/tools.ts`,
  `#lib/components/ToolCard.svelte`. `$lib` does not exist in SvelteKit 3.
- Components use PascalCase filenames; route folders use kebab-case.
- Tool copy lives only in `src/lib/tools.ts`; never hardcode tool names or descriptions in pages.
- API input/output uses Elysia `t.*` schemas; client types derive from `export type App`.
- Styling uses Tailwind utilities plus CSS variables from `src/routes/layout.css`; no raw hex colors
  in components.
- UI copy is Bahasa Indonesia and `lang="id"` stays; code comments are English.
- `oxfmt` does not format `.svelte`: hand-write tabs, single quotes, no semicolons, width 100.
- Never add a dependency for a few lines; prefer `fetch`, `URL`, `URLSearchParams`.
- Validate input, then build upstream URLs from validated IDs plus an allowlist (`youtube.com`,
  `youtu.be`, `i.ytimg.com`, `suno.com`). Never fetch a URL supplied by the user (SSRF).
- Upstream failures return `problem+json` with a clear message; no empty 200 and no stack traces.

## Boundaries (Do Not Touch)

- `worker-configuration.d.ts` — generated by `wrangler types` (`gen`/`check`/`build` run it).
- `.svelte-kit/`, `.wrangler/`, `node_modules/`, `bun.lock` — build output or lockfile.
- `src/routes/api/[...slugs]/+server.ts` — forwarder; add routes in `src/lib/server/api/index.ts`.
- `elysia` and `@elysia/eden` are exact `2.0.0-rc.*` pins; `2.0.0-beta.19` breaks the AOT build
  (`handler JIT is still reachable`). Bump deliberately, then run the gates.
- No `new Function`/`eval` in route bodies: `bun run build` AOT-precompiles Elysia and fails.
- `_headers` owns the CSP (`img-src 'self' data:`, Google Fonts only). Remote images/fonts require
  updating it; `/api/*` is `no-store`.
- Keep `name` identical in `package.json` and `wrangler.jsonc` (`ubetools`). Changing it changes the
  Worker name and the `workers.dev` URL.
- Keep Bun pinned to 1.4.4 in `.npmrc`, `package.json` and CI (`bun-version`).
- `.env` is gitignored; secrets go through Worker bindings, never inline or committed.
- `static/sitemap.xml` is intentionally absent until a production domain is confirmed.

## Verification Checklist

1. `bun run check` — must report 0 errors and 0 warnings.
2. `bun run lint` — Oxlint with `--deny-warnings`; fix the code instead of disabling rules.
3. `bun run test` — Vitest. Add a test for non-trivial logic: URL/ID parsing, upstream response
   parsing, filtering.
4. `bun run build` — must build the Worker and prerender `/`, `/tools`, and every registry slug.
5. `bun run dev`, then request `/`, `/tools` and `/tools/<slug>`; check the footer and tool cards.
6. `bun run verify` — runs everything above plus `format:check`; it must exit 0.

No nested `AGENTS.md` is needed: this is a single package. Add one only if a `packages/` workspace
or a second deployable Worker appears.
