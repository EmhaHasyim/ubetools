# Audit fixes design

**Goal:** Fix the 12 findings from the website audit with the smallest changes that keep the current
single-package SvelteKit/Workers design.

**Non-goals:** New tools, new dependencies, new runtime state beyond what the audit fixes need,
production-domain canonical URLs, analytics.

**Decisions made with the user:**

- Expired Suno signed URLs: store Suno clip IDs in the download token and resolve fresh URLs when
  the download route runs.
- Maskable PWA icon: generate a separate safe-zone icon with ImageMagick; keep the normal icon.

**Other decisions (agent's calls):**

- Rate limit: trust `request.cf.colo` plus `cf-connecting-ip` only on Cloudflare; reject requests
  with no usable client IP. Exempt `/health` from the tool quota rather than giving it a bucket.
- Suno limits: total 200 MB per download and one 60-second deadline shared by all file fetches;
  cap 50 links as today. `shortcut:` comments name the ceilings.
- Playlist completeness: add `skipped` to the POST response so the UI can say when fewer M4A files
  were found than clips returned. Keep the current ZIP naming.
- YouTube parsers: search the whole document for `playabilityStatus` and accept both
  `channelMetadataRenderer` and `channelPlayerMetadataRenderer`.
- OG: static tags only, with the observed `https://ubetools.workers.dev` image URL as the default;
  update it when a production domain is confirmed. No canonical tag until then.

**Approach:** Keep the existing modules. Fix each root cause in its current file, add one focused
regression test per behavior, then run `bun run verify` and a dev smoke check.
