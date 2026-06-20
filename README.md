# SkillBridge website

Lean, free-resource-hub site for **SkillBridge** — two high schoolers teaching the
professional skills school skips (LinkedIn, resumes, interviewing, networking, college
prep). Built with **Astro** (fully static), styled for **Vercel's free tier**.

## Pages

- `/` — **Landing**: hero, "what you'll find here," and the two primary CTAs.
- `/resources` — **Everything We Use**: the free toolkit as a normal web page + a
  **Download PDF** button.
- `/our-story` — **Our Story**: currently a **DRAFT** (see below).

## Fill these in before launch

Everything lives in **`src/config.json`** — edit once, it updates every page, button,
the footer, and the PDF:

- `discordUrl` — the real Discord invite (currently a placeholder).
- `instagramUrl` · `tiktokUrl` · `youtubeUrl` — confirm each resolves.
- `siteUrl` — set when the domain is purchased (canonical + Open Graph tags).

Other placeholders:

- **Google Skillshop** in the guide shows `[CONFIRM EXACT URL]` — kept verbatim on
  purpose. Confirm and replace it in `src/data/toolkit.json`, then run `npm run pdf`.
- **Our Story draft bar** — `src/pages/our-story.astro` shows a yellow "DRAFT" bar.
  Delete the `<div class="story__draftbar">…</div>` once the copy is approved.
- **Cross-link** — add this site's URL inside the Discord (server description or a
  channel) so the link goes both ways.

## Commands

| Command         | What it does                                                        |
| :-------------- | :------------------------------------------------------------------ |
| `npm run dev`   | Local preview at http://localhost:4321                              |
| `npm run build` | Static build to `./dist`                                            |
| `npm run pdf`   | Rebuild `public/everything-we-use.pdf` from `src/data/toolkit.json` |

> `npm run pdf` needs Chromium once: `npx playwright install chromium`.

## Content source of truth

- **`src/data/toolkit.json`** — the verbatim "Everything We Use" guide. Powers **both**
  the Resources page **and** the PDF, so they can never drift. Edit here → `npm run pdf`.
- **`src/data/ourStory.json`** — Our Story copy (draft).

## Deploy (yours to do)

Static Astro — Vercel auto-detects it. Import the repo in Vercel, no config needed, free
tier. The PDF is committed in `public/` and served as-is (Vercel does **not** run the PDF
generator).

## Brand

Navy `#1B3A6B` · Blue `#5BB8F5` · Light `#EBF4FC` · Dark `#0D1B2A`.
Manrope (headings) / Inter (body). Tokens live in `src/styles/global.css`.
