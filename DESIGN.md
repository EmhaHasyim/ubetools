---
name: ubeTools Design System
version: 1.0.0
aesthetic: clean-utility
defaultMode: light
colors:
  primary: '#2563EB'
  primary-hover: '#1D4ED8'
  on-primary: '#FFFFFF'
  surface: '#FAFAFA'
  surface-elevated: '#FFFFFF'
  surface-subtle: '#F4F4F5'
  on-surface: '#18181B'
  on-surface-muted: '#52525B'
  border: '#E4E4E7'
  border-strong: '#D4D4D8'
  error: '#DC2626'
  success: '#15803D'
  dark-primary: '#60A5FA'
  dark-primary-hover: '#93C5FD'
  dark-on-primary: '#09090B'
  dark-surface: '#09090B'
  dark-surface-elevated: '#121215'
  dark-surface-subtle: '#1C1C21'
  dark-on-surface: '#FAFAFA'
  dark-on-surface-muted: '#A1A1AA'
  dark-border: '#27272A'
  dark-border-strong: '#3F3F46'
  dark-error: '#F87171'
  dark-success: '#4ADE80'
typography:
  font-sans: "'Inter', system-ui, -apple-system, sans-serif"
  font-mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
  headline-display: 'clamp(1.875rem, 3vw, 2.5rem) / 1.15 / 700 / -0.025em'
  headline-lg: '1.5rem / 1.25 / 600 / -0.02em'
  headline-md: '1.125rem / 1.35 / 600 / -0.01em'
  body-lg: '1rem / 1.6 / 400 / 0'
  body-md: '0.9375rem / 1.6 / 400 / 0'
  body-sm: '0.875rem / 1.5 / 400 / 0'
  label-md: '0.8125rem / 1.4 / 500 / 0'
  label-sm: '0.75rem / 1.3 / 500 / 0.02em'
spacing:
  base: '4px'
  container-max: '1024px'
  workspace-max: '768px'
  section-y: '64px'
  card-padding: '20px'
  gutter: '16px'
rounded:
  none: '0px'
  sm: '6px'
  md: '8px'
  lg: '12px'
  full: '9999px'
motion:
  fast: '120ms cubic-bezier(0.2, 0, 0, 1)'
  base: '180ms cubic-bezier(0.2, 0, 0, 1)'
---

# DESIGN.md — ubeTools

## 1. Overview

ubeTools uses a **Clean Utility** visual language: calm neutral surfaces, 1px structural borders,
crisp typography, and an input-first workflow. Every screen prioritizes task completion over
decoration—users arrive with a URL, paste it, and get a clean downloadable or copyable output.

- **Personality:** Fast, trustworthy, quiet, technical-yet-approachable.
- **Language:** UI copy is Bahasa Indonesia (`lang="id"`), short and direct.
- **Themes:** Light and Dark modes, synced to `localStorage['ubetools-theme']` via `data-theme`.
- **Token Ownership:** This file defines the rules; `src/routes/layout.css` defines the CSS
  variables consumed by Tailwind CSS 4 utilities. Never hardcode raw hex values in `.svelte` files.

## 2. Colors

Use semantic CSS variables only. Every foreground/background pair meets WCAG AA (>= 4.5:1).

| Semantic Role    | CSS Variable               | Light     | Dark      | Usage                                         |
| :--------------- | :------------------------- | :-------- | :-------- | :-------------------------------------------- |
| Primary Accent   | `--color-primary`          | `#2563EB` | `#60A5FA` | Primary CTA, focus rings, active filter       |
| Primary Hover    | `--color-primary-hover`    | `#1D4ED8` | `#93C5FD` | Primary button hover state                    |
| Text on Primary  | `--color-on-primary`       | `#FFFFFF` | `#09090B` | Label inside primary buttons                  |
| Page Canvas      | `--color-surface`          | `#FAFAFA` | `#09090B` | `<body>` background                           |
| Elevated Surface | `--color-surface-elevated` | `#FFFFFF` | `#121215` | Tool cards, input boxes, result panels        |
| Subtle Surface   | `--color-surface-subtle`   | `#F4F4F5` | `#1C1C21` | Badges, tag chips, keyboard hints, hover rows |
| Primary Text     | `--color-on-surface`       | `#18181B` | `#FAFAFA` | Headings, body copy, input text               |
| Muted Text       | `--color-on-surface-muted` | `#52525B` | `#A1A1AA` | Descriptions, metadata, footer links          |
| Hairline Border  | `--color-border`           | `#E4E4E7` | `#27272A` | Cards, header/footer dividers, panels         |
| Strong Border    | `--color-border-strong`    | `#D4D4D8` | `#3F3F46` | Input default border, hovered cards           |
| Error            | `--color-error`            | `#DC2626` | `#F87171` | Validation errors, `problem+json` alerts      |
| Success          | `--color-success`          | `#15803D` | `#4ADE80` | "Tersalin" copy feedback, ready status        |

**Color Restraint Rule:** At least 90% of any viewport must be neutral (`surface` + `on-surface`).
Reserve `--color-primary` strictly for primary actions, active states, and keyboard focus rings.

## 3. Typography

Fonts load exclusively from Google Fonts (enforced by `_headers` CSP):

- **Sans (`Inter`):** All UI copy, headings, labels, navigation (weights `400`, `500`, `600`, `700`).
- **Mono (`JetBrains Mono`):** URLs inside inputs, video/track IDs, extracted tags, resolution
  dimensions (`1280x720`), and status codes (weights `400`, `500`).

| Role       | Font      | Size                           | Line Height | Weight | Tracking   | Usage                                     |
| :--------- | :-------- | :----------------------------- | :---------- | :----- | :--------- | :---------------------------------------- |
| Display    | Sans      | `clamp(1.875rem, 3vw, 2.5rem)` | `1.15`      | `700`  | `-0.025em` | Landing hero `<h1>`                       |
| Heading LG | Sans      | `1.5rem` (24px)                | `1.25`      | `600`  | `-0.02em`  | Tool page `<h1>`, directory title         |
| Heading MD | Sans      | `1.125rem` (18px)              | `1.35`      | `600`  | `-0.01em`  | Section titles, FAQ heading               |
| Body LG    | Sans      | `1rem` (16px)                  | `1.6`       | `400`  | `0`        | Hero subtitle, tool intro (max `65ch`)    |
| Body MD    | Sans      | `0.9375rem` (15px)             | `1.6`       | `400`  | `0`        | Default body, FAQ answers                 |
| Body SM    | Sans      | `0.875rem` (14px)              | `1.5`       | `400`  | `0`        | `ToolCard` description, helper text       |
| Label MD   | Sans      | `0.8125rem` (13px)             | `1.4`       | `500`  | `0`        | Buttons, nav links, form labels           |
| Label SM   | Mono/Sans | `0.75rem` (12px)               | `1.3`       | `500`  | `0.02em`   | Status badges ("Segera"), resolution tags |

**Mobile (<640px) overrides:** `text-xs`, `.label-mono`, `.badge` and `.search-kbd` become 14px;
`text-sm`, `.nav-link`, `.footer-link` and `.filter-chip` become 15px (14px for the latter three);
`text-[15px]` copy becomes 16px. All input/textarea fonts become 16px to prevent iOS zoom.
Desktop keeps the table above unchanged.

## 4. Layout & Spacing

Built on a strict **4px spacing grid** (`4`, `8`, `12`, `16`, `20`, `24`, `32`, `48`, `64`).

- **App Shell (`+layout.svelte`):** Sticky 60px `Header` with bottom `1px solid var(--color-border)`,
  centered `<main id="main">`, minimal `Footer` with top hairline divider. Keep the skip link
  accessible on `:focus-visible`.
- **Container Widths:**
  - Marketing & Directory (`/`, `/tools`): `max-w-5xl` (`1024px`), horizontal padding `16px` mobile / `24px` desktop.
  - Tool Workspace (`/tools/[slug]`): `max-w-3xl` (`768px`) centered single-column flow—header,
    input bar, output panel, then brief usage/FAQ notes below.
- **Grids:**
  - `ToolCard` grid: `1` column (`<640px`), `2` columns (`640px–1023px`), `3` columns (`>=1024px`), `gap: 16px`.
  - Thumbnail result: a single best-available card (resolution fallback ordered) with a `16:9` aspect-ratio frame; no variant picker.
- **Vertical Rhythm:** `48px–64px` between major page sections; `16px–24px` between related blocks.

## 5. Elevation & Depth

Use **flat structural separation**—surfaces separate via contrast and `1px` borders, not drop shadows.

- **Level 0 (Canvas):** `--color-surface`, no border, no shadow.
- **Level 1 (Card / Input / Output Panel):** `--color-surface-elevated` + `1px solid var(--color-border)`.
  On interactive card hover, shift border to `--color-border-strong` (no scale bounce, no heavy glow).
- **Level 2 (Header / Popover):** `--color-surface` at 90% opacity with subtle `backdrop-filter: blur(8px)`
  and `1px solid var(--color-border)`—used only on the sticky top bar.
- **Shadows:** Avoid `box-shadow` except a crisp `0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent)`
  focus ring for keyboard navigation.

## 6. Shapes

Keep radii tight and consistent to preserve a technical, precision feel:

- **Inputs, Buttons, Category Chips:** `8px` (`--radius-md`)
- **Cards, Output Panels, Error Alerts:** `12px` (`--radius-lg`)
- **Badges & Small Tags:** `6px` (`--radius-sm`) or `9999px` (`--radius-full`) for status pills only.
- **Thumbnails / Media Previews:** `8px` (`--radius-md`) inside a `1px` bordered frame.

## 7. Components

### Header & Footer

- `Header`: Height `60px`. Left: text-first wordmark `ubeTools` (semibold, tight tracking).
  Right: clean links (`Tools`) + icon-only theme toggle button (`44x44px` mobile, `36x36px` desktop, `aria-label` in Indonesian).
- `Footer`: Compact single-row on desktop, stacked on mobile. Copyright, brief positioning line,
  and essential links only.

### Primary & Secondary Buttons

- **Height:** `40px` desktop / `44px` mobile (tool command bar: `52px` desktop, `56px` mobile).
- **Primary:** `--color-primary` background, `--color-on-primary` text, `font-weight: 500`, `radius-md`.
- **Secondary / Copy Action:** `--color-surface-elevated` background, `1px solid var(--color-border-strong)`,
  `--color-on-surface` text; hover shifts background to `--color-surface-subtle`.
- **Loading State:** Disable button, retain width, swap label to concise Indonesian verb (`Memproses...`).

### Input & Tool Command Bar

- Primary tool URL input sits prominently above the fold on `/tools/[slug]`.
- Height `52px` desktop / `56px` mobile, `JetBrains Mono` for URL values, clear placeholder example (e.g., `https://youtube.com/watch?v=...`). The taller bar is a deliberate exception to the 44px button height for comfortable mobile pasting.
- Font size `16px` on mobile so iOS Safari does not auto-zoom on focus. In the stacked mobile layout the input must use `flex: none`; a `flex: 1` input in a column flex container collapses to its content height.
- Pair input + primary submit button inline on `>=640px`, stacked full-width on mobile.

### ToolCard (`ToolCard.svelte` + `ToolIcon.svelte`)

- Padding `20px`, `radius-lg`, `1px solid var(--color-border)`, background `--color-surface-elevated`.
- Top row: `ToolIcon` inside a `36x36px` `--color-surface-subtle` rounded square (`radius-md`, stroke `1.75px`)
  - subtle status pill on the right (`Segera` in muted subtle pill; omit pill once live to reduce noise).
- Body: Tool title (`16px` semibold) + 2-line max description (`14px` muted). Entire card is a single `<a>`.

### Result & Error States

- **Empty / Initial State:** Clean placeholder box with dashed `1px solid var(--color-border-strong)`
  explaining what will appear once a valid link is submitted.
- **Error Alert (`problem+json`):** Left `3px` accent stripe or `1px` border tinted with `--color-error`,
  clear Indonesian title + actionable detail message. Never expose stack traces or raw JSON.
- **Copyable Tags / Output:** Individual pill chips with `JetBrains Mono` text + a single "Salin semua" secondary button.

## 8. Do's and Don'ts

**Do**

- Design every tool page so the input field is immediately usable without scrolling on desktop and mobile.
- Maintain visible `:focus-visible` outlines on every interactive element and keep contrast >= 4.5:1.
- Respect `prefers-reduced-motion: reduce` by disabling transitions.
- Sync any new visual token into `src/routes/layout.css` before using it in components.

**Don't**

- **No decorative gradients, neon glows, or mesh backgrounds** behind heroes or cards.
- **No glassmorphism on content cards** (reserve subtle blur strictly for the sticky header).
- **No raw hex colors** (`#fff`, `#333`) or arbitrary Tailwind color scales (`bg-blue-500`) inside `.svelte` components; bind to CSS variables in `src/routes/layout.css`.
- **No marketing fluff** (fake testimonials, bloated feature carousels, or multi-column mega-footers).
- **No layout shift (CLS)** when loading remote YouTube thumbnails—always set `aspect-video` (`16:9`) containers.
- **No second brand accent color**—status colors (`error`, `success`) are strictly semantic.
