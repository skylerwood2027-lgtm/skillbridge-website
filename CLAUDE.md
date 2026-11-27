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
- **Teammates adding a resource** (David): use the `add-resource` skill
  (`.claude/skills/add-resource/SKILL.md`). Skyler approved resource-only pushes
  straight to `main` (the repo is public, so Vercel deploys teammates' commits)
  once `resources:check` and `build` pass. Any other change still needs Skyler.

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

Engine: **GSAP** (choreography, ScrollTrigger, SplitText, DrawSVG) + **Lenis**
(smooth scroll), all in `src/scripts/motion.ts`. Skyler asked for this on
2026-10-11. Effects are adapted from **Magic UI** and **React Bits** but rebuilt
on GSAP. Don't add React, Tailwind, or `motion/react` to use those libraries.
Pull a component's source from their registries (`magicui.design/r/<name>.json`,
`reactbits.dev/r/<Name>-TS-CSS.json`, or the `magicui` MCP) and port it.

- One orchestrated moment: the home hero. The headline rises word by word,
  the founders blur-fade in, then the logo's suspension bridge
  (`HeroBridge.astro`) is built (deck, towers, cable, hangers) and one light
  crosses it. On phones the bridge builds when it scrolls into view.
- Supporting motion stays quiet: `main h2` line-mask reveals, portrait and
  band-motif scroll drift, the primary-button hover sheen, and the
  scroll-progress hairline on long pages only.
- Other content keeps the `.reveal` IntersectionObserver fade.
- Reduced motion or no JS = the finished static page. `motion-pending` hides
  the hero only until GSAP sets start states, with a 2.5s failsafe.
- Programmatic scrolling goes through `window.lenis.scrollTo` when it exists
  (see `bridge-finder.astro`). Native smooth scrolling fights Lenis.
- Skyler's laptop has Windows "Animation effects" off, so Chrome reports reduced
  motion and his own browser shows the static site. To review motion, force it
  in Puppeteer with `emulateMediaFeatures([{ name: 'prefers-reduced-motion',
  value: 'no-preference' }])`. `npm run shots` stays reduced-motion on purpose.
- If an effect feels gimmicky, cut it (the Chanel rule: before leaving the
  house, remove one accessory).
