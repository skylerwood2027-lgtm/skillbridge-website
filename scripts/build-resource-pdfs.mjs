// Generates the video-specific resource PDFs in public/resources/ from the JSON
// sources in src/data/resource-content/, using the shared editorial system in
// scripts/pdf-system.mjs.
//
//   npm run resources:pdf
//
// Content lives in data; the PDF is a render of that data, so nothing is
// hand-authored as an opaque binary and every guide can be regenerated.
//
// Page count is NOT constrained. A clean two-page guide beats a cramped one-page
// guide. The build reports how full the final sheet is and warns on a nearly-empty
// one, which is the only pagination outcome worth preventing.

import { chromium } from 'playwright';
import { readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  SYSTEM_CSS, EXT_ICON, PDF_OPTIONS, PRINT_W, PRINT_H,
  balanceReport, esc, showUrl, loadFonts, loadWordmark,
} from './pdf-system.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SRC = join(root, 'src', 'data', 'resource-content');
const OUT = join(root, 'public', 'resources');

const fonts = await loadFonts(root);
const wordmark = await loadWordmark(root, 'wordmark.png');

function renderEntry(e) {
  const twoCol = e.bestFor && e.pairWith;
  return `<section class="item">
    <div class="item__head">
      <span class="item__n">${esc(e.n)}</span>
      <div>
        ${e.provider ? `<p class="item__provider">${esc(e.provider)}</p>` : ''}
        <h3>${esc(e.title)}</h3>
      </div>
    </div>
    <div class="item__body">
      ${e.lead ? `<p class="item__lead">${esc(e.lead)}</p>` : ''}
      <div class="item__tail">
      ${
        twoCol
          ? `<div class="item__grid">
              <p class="val"><span class="lbl">Best for</span>${esc(e.bestFor)}</p>
              <p class="val"><span class="lbl">Pair it with</span>${esc(e.pairWith)}</p>
            </div>`
          : ''
      }
      ${e.items?.length ? `<ul>${e.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      ${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}
      ${e.warn ? `<p class="warnline">${esc(e.warn)}</p>` : ''}
      ${
        e.action
          ? `<div class="act">
              <a class="btn" href="${esc(e.action.url)}">${esc(e.action.label)}${EXT_ICON}</a>
              <span class="act__url"><b>${showUrl(e.action.url)}</b>${
                e.action.note ? ` — ${esc(e.action.note)}` : ''
              }</span>
            </div>`
          : ''
      }
      </div>
    </div>
  </section>`;
}

function render(doc) {
  const rule = doc.rule
    ? `<section class="rule">
        <h2>${esc(doc.rule.title)}</h2>
        ${doc.rule.body ? `<p>${esc(doc.rule.body)}</p>` : ''}
        ${doc.rule.items?.length ? `<ul>${doc.rule.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      </section>`
    : '';

  const top = doc.rulePosition === 'top';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${fonts}
${SYSTEM_CSS}
</style></head><body>
  <header class="mast">
    <div class="mast__brand"><img src="data:image/png;base64,${wordmark}" alt="SkillBridge" /></div>
    ${doc.fromVideo ? `<p class="mast__k">${esc(doc.fromVideo)}</p>` : ''}
    <h1>${esc(doc.title)}</h1>
    <p class="mast__sub">${esc(doc.subtitle)}</p>
    <div class="deck"><i style="width:34%"></i></div>
  </header>
  <p class="lede">${esc(doc.intro)}</p>
  ${top ? rule : ''}
  <div class="list">${doc.entries.map(renderEntry).join('')}</div>
  ${top ? '' : rule}
  <p class="verify"><b>Last verified ${esc(doc.verified)}.</b> ${esc(doc.verifyNote)}</p>
</body></html>`;
}

const files = (await readdir(SRC)).filter((f) => f.endsWith('.json')).sort();
if (!files.length) {
  console.error('[resource-pdf] no JSON sources in', SRC);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let warnings = 0;
try {
  for (const file of files) {
    const doc = JSON.parse(await readFile(join(SRC, file), 'utf8'));
    const outPath = join(OUT, `${doc.slug}.pdf`);
    const page = await browser.newPage({ viewport: { width: PRINT_W, height: PRINT_H } });
    await page.setContent(render(doc), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // body's own box, not documentElement.scrollHeight — the latter is clamped to
    // the viewport and would report a half-empty sheet as full.
    const flow = await page.evaluate(() => document.body.getBoundingClientRect().height);
    await page.pdf({ path: outPath, ...PDF_OPTIONS(doc.title) });
    await page.close();

    const buf = await readFile(outPath);
    const { size } = await stat(outPath);
    const { pages, lastFill } = balanceReport(buf, flow);
    const thin = lastFill < 18;
    if (thin) warnings++;
    console.log(
      `[resource-pdf] ${doc.slug}.pdf  ${pages} page${pages > 1 ? 's' : ''}  ` +
        `${(size / 1024).toFixed(0)} KB  last sheet ${lastFill}% full${thin ? '  <-- NEARLY EMPTY' : ''}`
    );
  }
} finally {
  await browser.close();
}
console.log(`[resource-pdf] ${files.length} PDFs -> ${OUT}`);
if (warnings) {
  console.error(`[resource-pdf] ${warnings} guide(s) end on a nearly-empty sheet — rebalance before shipping.`);
  process.exit(1);
}
