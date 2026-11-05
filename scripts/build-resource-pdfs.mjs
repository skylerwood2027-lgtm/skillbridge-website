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
  const pageBreak = e.pageBreakBefore ? ' item--page-break' : '';
  return `${e.section ? `<h2 class="list__section">${esc(e.section)}</h2>` : ''}<section class="item${pageBreak}">
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

// Compact row for long directory-style lists. Used when an entry carries `pay`.
function renderRow(e) {
  return `${e.section ? `<h2 class="list__section">${esc(e.section)}</h2>` : ''}<section class="row">
    <div class="row__top">
      <div>
        ${e.provider ? `<p class="item__provider">${esc(e.provider)}</p>` : ''}
        <h3><span class="row__n">${esc(e.n)}</span>${esc(e.title)}</h3>
      </div>
      <a class="row__link" href="${esc(e.url)}">Official page${EXT_ICON}</a>
    </div>
    <div class="row__grid">
      <p><b>Pay</b> ${esc(e.pay)}</p>
      <p><b>Deadline</b> ${esc(e.deadline)}</p>
    </div>
    <p><b>Who</b> ${esc(e.who)}</p>
    <p><b>How hard</b> <strong>${esc(e.odds)}</strong>${e.oddsNote ? ` ${esc(e.oddsNote)}` : ''}</p>
  </section>`;
}

function render(doc) {
  const glance = doc.glance
    ? `<section class="glance">
        <h2>${esc(doc.glance.title)}</h2>
        <ul>${doc.glance.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </section>`
    : '';
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
.item--page-break{break-before:page}
.list__section{font-size:14.5pt;margin:16pt 0 5pt;break-after:avoid}
.list__section:first-child{margin-top:4pt}
.list__section + .item,.list__section + .row{border-top:1.5pt solid #1B3A6B}
.row{padding:6pt 0 7pt;border-top:.75pt solid #DCE8F5;break-inside:avoid}
.row__top{display:flex;justify-content:space-between;align-items:flex-end;gap:12pt}
.row h3{font-size:11.2pt;margin-top:1pt}
.row__n{color:#5BB8F5;margin-right:5pt}
.row__link{display:inline-flex;align-items:center;gap:3pt;flex:none;font-family:'Manrope',sans-serif;font-size:8.2pt;font-weight:700;color:#155A8A;white-space:nowrap}
.row__link svg{width:8pt;height:8pt}
.row__grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16pt}
.row p:not(.item__provider){margin-top:2.6pt;font-size:9.4pt;line-height:1.38;color:#43567A}
.row p b{font-family:'Manrope',sans-serif;font-size:8pt;font-weight:800;color:#155A8A;margin-right:2pt}
.row p strong{font-weight:700;color:#1B3A6B}
.glance{margin-top:12pt;padding:9pt 12pt 10pt;background:#EEF6FD;border-radius:6pt;break-inside:avoid}
.glance h2{font-size:12pt}
.glance ul{margin:5pt 0 0;padding:0;list-style:none;columns:2;column-gap:18pt}
.glance li{padding:1.4pt 0;font-size:9.6pt;line-height:1.36;color:#1B3A6B;break-inside:avoid}
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
  ${glance}
  <div class="list">${doc.entries.map((e) => (e.pay ? renderRow(e) : renderEntry(e))).join('')}</div>
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
