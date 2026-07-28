// Generates the SkillBridge Starter Toolkit PDF from the SAME content source as
// its web page (src/data/toolkit.json), so the PDF and the page can never drift.
// Uses the shared editorial system in scripts/pdf-system.mjs, so the toolkit and
// the four video guides read as one family.
//
//   npm run pdf
//
// Two files are written. The renamed one is primary; the old
// /everything-we-use.pdf filename is written as an identical copy so links
// already out in the world keep resolving — a static host cannot redirect one
// .pdf to another.
//
// Requires the Chromium browser: `npx playwright install chromium` (one-time).

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import toolkit from '../src/data/toolkit.json' with { type: 'json' };
import {
  SYSTEM_CSS, PDF_OPTIONS, PRINT_W, PRINT_H,
  balanceReport, esc, loadFonts, loadWordmark, LIBRARY_URL,
} from './pdf-system.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const fonts = await loadFonts(root);
const wordmark = await loadWordmark(root, 'wordmark.png');

const sectionsHtml = toolkit.sections
  .map(
    (sec) => `<section class="item">
      <div class="item__head">
        <span class="item__n">${esc(sec.n)}</span>
        <div><h3>${esc(sec.title)}</h3></div>
      </div>
      <div class="item__body">
        <ul>${sec.items
          .map(
            (it) =>
              `<li>${it.name ? `<b>${esc(it.name)}</b> — ` : ''}${esc(it.body)}${
                it.urlText ? ` <span class="u">${esc(it.urlText)}</span>` : ''
              }${it.urlPlaceholder ? ` <span class="ph">${esc(it.urlPlaceholder)}</span>` : ''}</li>`
          )
          .join('')}</ul>
      </div>
    </section>`
  )
  .join('');

const trapsHtml = `<section class="rule rule--warn">
    <h2>${esc(toolkit.traps.title)}</h2>
    <ul>${toolkit.traps.items.map((it) => `<li>${esc(it.body)}</li>`).join('')}</ul>
  </section>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${fonts}
${SYSTEM_CSS}
/* Toolkit-specific: the entries are lists of tools rather than numbered steps,
   so each bullet carries a name in navy with its link text inline. */
.item li b{color:#1B3A6B;font-weight:700}
.u{color:#155A8A;font-weight:600;white-space:nowrap}
.ph{color:#7A5800;background:#FFF6E3;padding:0 3pt;border-radius:3pt;font-size:9pt}
.rule--warn{border-left-color:#D9543B}
.rule--warn h2{color:#A8341D}
</style></head><body>
  <header class="mast">
    <div class="mast__brand"><img src="data:image/png;base64,${wordmark}" alt="SkillBridge" /></div>
    <p class="mast__k">The free toolkit</p>
    <h1>${esc(toolkit.title)}</h1>
    <p class="mast__sub">${esc(toolkit.tagline)}</p>
    <div class="deck"><i style="width:34%"></i></div>
  </header>
  <p class="lede">${esc(toolkit.intro)}</p>
  <div class="list">${sectionsHtml}</div>
  ${trapsHtml}
  <p class="verify"><b>${esc(toolkit.outroLead)}</b> ${esc(toolkit.outroDiscord)} Free from SkillBridge — ${LIBRARY_URL}</p>
</body></html>`;

const outDir = join(root, 'public');
const PRIMARY = join(outDir, 'skillbridge-starter-toolkit.pdf');
const LEGACY = join(outDir, 'everything-we-use.pdf');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: PRINT_W, height: PRINT_H } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const flow = await page.evaluate(() => document.body.getBoundingClientRect().height);
  await mkdir(outDir, { recursive: true });
  await page.pdf({ path: PRIMARY, ...PDF_OPTIONS(toolkit.title) });

  const buf = await readFile(PRIMARY);
  await writeFile(LEGACY, buf); // keep the old URL alive, byte-for-byte
  const { size } = await stat(PRIMARY);
  const { pages, lastFill } = balanceReport(buf, flow);
  console.log(
    `[pdf] skillbridge-starter-toolkit.pdf  ${pages} pages  ${(size / 1024).toFixed(0)} KB  ` +
      `last sheet ${lastFill}% full${lastFill < 18 ? '  <-- NEARLY EMPTY' : ''}`
  );
  console.log('[pdf] everything-we-use.pdf written as an identical copy (legacy URL)');
} finally {
  await browser.close();
}
