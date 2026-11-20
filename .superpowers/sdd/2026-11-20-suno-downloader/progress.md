# SDD ledger — plan: docs/superpowers/plans/2026-11-20-suno-downloader.md

Ruling: no git repo/worktree, so task brief scripts and commits are skipped; this ledger and the todo list are the progress record.
Pre-flight: no shared interfaces — Task 2 consumes `parseSunoRequest`, `parseSunoMedia`, `resolveSunoTargets` and `SunoRequest`/`SunoTarget` from Task 1; its tests and implementation match those signatures. Task 3 consumes the Task 2 response shape `{ downloadUrl, mode, count? }`.
Task 1: complete (tests: `bun run test src/lib/suno.spec.ts` → 10 passed; full suite 51 passed; `bun run check` → 0 errors/0 warnings). Files: `src/lib/suno.ts`, `src/lib/suno.spec.ts`.
Task 2: complete (tests: `bun run test src/lib/server/api/suno-download.spec.ts` → 8 passed; full suite 59 passed; `bun run check` → 0 errors/0 warnings; `bun run lint` → clean). Files: `src/lib/server/api/index.ts`, `src/lib/suno.ts`, `src/lib/server/api/suno-download.spec.ts`, `package.json`/`bun.lock` (fflate@0.8.3).
Ruling: returned ZIP audio buffered in memory with a `shortcut:` comment (level 0 ZIP, max 50 files), because no streaming ZIP dependency was requested and the 50-link cap bounds the ceiling. Cost: a Worker with 50 very long songs could hit memory limits; upgrade to a streaming ZIP writer then.
Task 3: complete (tests: `bun run test src/lib/components/tools/SunoMusicTool.spec.ts` → 2 passed; `bun run verify` → exit 0, 61 tests, build/prerender done). Files: `src/lib/components/tools/SunoMusicTool.svelte`, `src/lib/components/tools/SunoMusicTool.spec.ts`, `src/routes/tools/[slug]/+page.svelte`, `src/lib/tools.ts`, `README.md`, `AGENTS.md`. Svelte autofixer: no issues.
Final review (fresh-context reviewer del_mwp2jshg_42jn): all 4 Important findings fixed with RED→GREEN regressions — five-concurrent Suno probes (peak concurrency test), 32,000-char token cap (50-long-URL round trip), one try/catch over fetch+arrayBuffer with audio/* or application/octet-stream validation (broken stream + text/html tests), no-store cache headers. Minor fixes: canonical ASCII URL check in isAllowedMediaUrl, README scope sentence, uppercase-host and 32-encrypted-clip tests. Thumbnail download cache header left unchanged: Final: minor (deferred) — pre-existing route outside this plan's scope; user-visible risk is thumbnail URL caching for an hour, already the prior behavior.
Final verification: `bun run verify` exit 0, 9 files/67 tests, check 0/0, lint/format clean, build/prerender done; dev smoke all routes 200.
Second review (user asked "perbaiki semua yang ditemukan"): all six findings fixed test-first (7 RED→GREEN tests; 2 follow-up fixture updates after narrowing CloudFront URLs and removing count).

1. isAllowedMediaUrl accepts canonical percent-encoded URLs (`value === url.href`, ASCII only), restricts CloudFront to /clip/*.m4a and cdn-o.suno.com to *.m4a.
2. GET download rejects Content-Length > 25 MB and buffers at most 25 MB per file, with comment on per-file limit; narrow CloudFront path closes arbitrary-file proxy case.
3. `count` removed from POST response schema/body and SunoMusicTool UI; ZIP contents can be fewer than resolved links.
4. Copy changed to "tanpa metadata tambahan" in tools.ts and component.
5. POST checks encoded token length before returning a URL (502 with Indonesian message if > 32,000 chars).
6. Unused SunoTarget.index field and assignments deleted.
   Final verification: `bun run verify` exit 0, 9 files/72 tests, check 0/0, lint/format clean, build/prerender done; dev smoke routes all 200.
