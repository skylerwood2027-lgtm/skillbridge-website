// Generates public/everything-we-use.pdf from the SAME content source as the
// Resources web page (src/data/toolkit.json), so the PDF and the page can never
// drift apart. Brand fonts (Manrope/Inter) are inlined from @fontsource so the
// PDF renders identically offline.
//
//   npm run pdf
//
// Requires the Chromium browser: `npx playwright install chromium` (one-time).

import { chromium } from 'playwright';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import toolkit from '../src/data/toolkit.json' with { type: 'json' };
import config from '../src/config.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function fontFace(family, pkg, weight, style = 'normal') {
  const dir = join(root, 'node_modules', '@fontsource', pkg, 'files');
  let files = [];
  try {
    files = await readdir(dir);
  } catch {
    return '';
  }
  const match =
    files.find((f) => f.includes(`-latin-${weight}-${style}`) && f.endsWith('.woff2')) ||
    files.find((f) => f.includes(`latin`) && f.includes(`-${weight}-${style}`) && f.endsWith('.woff2'));
  if (!match) {
    console.warn(`[build-pdf] no woff2 found for ${family} ${weight} in @fontsource/${pkg} — the PDF will fall back to a system font for this weight.`);
    return '';
  }
  const b64 = (await readFile(join(dir, match))).toString('base64');
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}

const fonts = (
  await Promise.all([
    fontFace('Manrope', 'manrope', 700),
    fontFace('Manrope', 'manrope', 800),
    fontFace('Inter', 'inter', 400),
    fontFace('Inter', 'inter', 600),
    fontFace('Inter', 'inter', 700),
  ])
).join('');

const wordmarkB64 = (await readFile(join(root, 'public', 'brand', 'wordmark-white.png'))).toString('base64');

const sectionsHtml = toolkit.sections
  .map(
    (sec) => `<section class="sec">
      <h2><span class="num">${sec.n}</span>${esc(sec.title)}</h2>
      <ul>${sec.items
        .map(
          (it) =>
            `<li>${it.name ? `<strong>${esc(it.name)}</strong> — ` : ''}${esc(it.body)}${
              it.urlText ? ` <span class="url">${esc(it.urlText)}</span>` : ''
            }${it.urlPlaceholder ? ` <span class="ph">${esc(it.urlPlaceholder)}</span>` : ''}</li>`
        )
        .join('')}</ul>
    </section>`
  )
  .join('');

const trapsHtml = `<section class="traps">
    <h2>${esc(toolkit.traps.title)}</h2>
    <ul>${toolkit.traps.items.map((it) => `<li>${esc(it.body)}</li>`).join('')}</ul>
  </section>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;color:#0D1B2A;font-size:11px;line-height:1.5}
h1,h2{font-family:'Manrope',system-ui,sans-serif;color:#1B3A6B;letter-spacing:-.02em}
.cover{background:linear-gradient(135deg,#1B3A6B,#0D1B2A);color:#fff;border-radius:14px;padding:22px 24px;margin-bottom:16px}
.cover .brand{margin-bottom:12px}
.cover .brand img{height:26px;width:auto;display:block}
.cover h1{color:#fff;font-size:26px;margin:0 0 8px;font-weight:800}
.cover .tag{color:rgba(235,244,252,.92);font-size:11px;margin:0;max-width:64ch}
.intro{color:#475a78;font-size:11px;margin:0 0 14px;max-width:70ch}
.sec{border:1px solid #d9e8f8;border-radius:12px;padding:11px 14px;margin-bottom:9px;break-inside:avoid}
.sec h2{font-size:13px;margin:0 0 5px;display:flex;align-items:center;gap:8px}
.num{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#1B3A6B;color:#fff;font-size:11px;font-weight:800;flex:none}
.sec ul{margin:0;padding:0;list-style:none}
.sec li{padding:5px 0;border-top:1px solid #eef5fc}
.sec li:first-child{border-top:none}
.sec strong{color:#1B3A6B}
.url{color:#155a8a;font-weight:600;white-space:nowrap}
.ph{color:#7a5800;background:#fff6e3;border:1px dashed #e0b865;padding:0 4px;border-radius:4px;font-size:10px}
.traps{background:#fff6f4;border:1px solid #f3cfc6;border-left:4px solid #d9543b;border-radius:12px;padding:11px 14px;margin:10px 0;break-inside:avoid}
.traps h2{color:#a8341d;font-size:13px;margin:0 0 5px}
.traps ul{margin:0;padding-left:16px}
.traps li{padding:3px 0}
.outro{background:linear-gradient(135deg,#1B3A6B,#0D1B2A);color:#fff;border-radius:12px;padding:14px 16px;text-align:center;margin-top:12px;break-inside:avoid}
.outro p{margin:3px 0;color:rgba(235,244,252,.95)}
.outro a{color:#5BB8F5;text-decoration:none}
</style></head><body>
  <div class="cover">
    <div class="brand"><img src="data:image/png;base64,${wordmarkB64}" alt="SkillBridge" /></div>
    <h1>${esc(toolkit.title)}</h1>
    <p class="tag">${esc(toolkit.tagline)}</p>
  </div>
  <p class="intro">${esc(toolkit.intro)}</p>
  ${sectionsHtml}
  ${trapsHtml}
  <section class="outro">
    <p>${esc(toolkit.outroLead)} ${esc(toolkit.outroDiscord)}</p>
    <p>→ <a href="${esc(config.discordUrl)}">Join the SkillBridge Discord</a> &nbsp;·&nbsp; ${esc(config.handle)}</p>
  </section>
</body></html>`;

const outDir = join(root, 'public');
const outPath = join(outDir, 'everything-we-use.pdf');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(outDir, { recursive: true });
  await page.pdf({
    path: outPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', bottom: '0.7in', left: '0.65in', right: '0.65in' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font-family:sans-serif;font-size:8px;color:#90a4be;padding:0 0.65in;display:flex;justify-content:space-between;"><span>SkillBridge — everything we use · ${esc(
      config.handle
    )}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  console.log('PDF written:', outPath);
} finally {
  await browser.close();
}
