# CLAUDE.md — SkillBridge website

This repo is the **SkillBridge public website** (Astro, static, Vercel free tier).
It is separate from the content engine in the Agentic Workflow repo. Polish and
branding for the site live here.

## Standing rules (do not skip)

- **Invoke the `frontend-design` skill BEFORE writing or changing any frontend
  code** — layout, CSS, components, motion. Design first, then build.
- **Run the screenshot-review loop after any visual change.** `npm run shots`
  captures every page at desktop + mobile into `.screens/`. Open the renders,
  review for layout, spacing, contrast, and balance, and do **at least 2
  self-correction passes** before calling it done. A passing build is not proof
  it looks good — only the screenshots are.
- **Localhost only. Never push to GitHub until Skyler explicitly says so.** No
  deploys, no account creation, no domain purchase, no Vercel auth.

## Brand (LOCKED — never change without Skyler's ok)

- Palette: navy `#1B3A6B` · blue `#5BB8F5` · light `#EBF4FC` · dark `#0D1B2A`.
  Tokens live in `src/styles/global.css`.
- Fonts: **Manrope** (headings), **Atkinson Hyperlegible Next** (body, via
  `@fontsource-variable/atkinson-hyperlegible-next`). Skyler approved replacing
  Inter on 2026-10-09 because Inter + Manrope read as the stock AI-site pairing.
  **Do not switch the body back to Inter.** (The PDF and OG scripts still embed
  Inter from `@fontsource/inter`; that is separate.)
- No tracked ALL-CAPS kicker/eyebrow labels above headings — the heading speaks
  for itself. Small labels (categories, "Use this when", file facts) are
  sentence case. Lists are hairline rows, not boxed tiles or pill chips.
- Logo: real assets only. Sources in `brand-src/`, processed into `public/brand/`
  by `npm run logos`:
  - `wordmark.png` (navy) → light backgrounds · `wordmark-white.png` → dark
    backgrounds · `icon.png` → favicon / social / tight spaces.
  - The logo is navy-on-light, so **dark sections must use the white wordmark** —
    never place a navy logo on a dark background.
- **No** generic stock photos, generic icon sets, or AI-generated hero imagery.
  Use the bridge/book motif, real screenshots, or a clearly-marked placeholder.
- **No fabricated metrics.** SkillBridge is pre-signal (~100 followers) — never
  invent follower / impression / engagement numbers.

## Content

- The "Everything We Use" guide is **verified — render it verbatim** from
  `src/data/toolkit.json`. It feeds both the Resources page and the PDF. Don't
  paraphrase. Edit there, then `npm run pdf`.
- `src/config.json` is the single source of truth for fill-in URLs (Discord,
  socials, site).
- Our Story (`src/data/ourStory.json`) is a **draft pending Skyler's review** (a
  draft bar shows on the page until removed).

## Commands

- `npm run dev` — local preview at http://localhost:4321
- `npm run shots` — screenshot-review loop (desktop + mobile → `.screens/`)
- `npm run logos` — reprocess brand assets from `brand-src/`
- `npm run pdf` / `npm run og` — regenerate the guide PDF / social card
- `npm run build` — static build to `./dist`

## Motion

Restrained only. Scroll-reveal via the `.reveal` class (IntersectionObserver in
`BaseLayout.astro`), hover micro-interactions, and the bridge motif. Always
reduced-motion safe. If an effect feels gimmicky, cut it (the Chanel rule:
before leaving the house, remove one accessory).
