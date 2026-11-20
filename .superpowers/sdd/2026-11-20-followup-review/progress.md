# SDD ledger — follow-up review fixes (2026-11-20)

Scope: all 7 findings from the user-requested re-review of both live YouTube tools.
Pre-flight: no git repository; ledger replaces commit checkpoints.

RED: added API tests for body-read failure (got 500, expected 502), non-JPEG upstream (got 200, expected 502), unavailable/blocked states and download 429 (the latter three already passed, so they lock in existing behavior rather than prove a fix).
GREEN: fixed tags upstream read inside the try/catch, validated download content type, and extracted the shared checkQuota helper. API spec 19/19 passed; check and lint clean.
Ruling: `HTTPHeaders` from Elysia is the correct type for the shared helper's `set` parameter; `Record<string, string>` rejected by svelte-check. — Uses library type, no cast.
Ruling: download stream test now includes `content-type: image/jpeg` in its mock response because the endpoint checks it before streaming. — Mock mirrors a real ytimg response.
Docs: stale `/tools` copy removed; `REPORT-AUDIT.md` marked SUPERSEDED with a list of resolved/still-relevant findings rather than rewriting historical audit content.
UI: tags copy timer cleared before reset so repeated clicks keep "Tersalin" accurate; Svelte MCP autofixer reported zero issues.
Gate: `bun run verify` exit 0 — 0 errors/0 warnings, 41 tests passed, build passed.
Smoke: dev API returned 5 channel tags and a 21,011-byte JPEG download with correct headers; directory no longer says all tools are under construction.
Not fixed: the acknowledged cross-isolate in-memory rate-limit ceiling in `src/lib/server/rate-limit.ts` — outside this follow-up scope; upgrade path already documented in the `shortcut:` comment.
