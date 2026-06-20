// Generates public/og.png — the 1200x630 social-share card (Open Graph /
// Twitter). Brand-styled, fonts embedded from @fontsource. Run after brand
// changes:  npm run og   (needs `npx playwright install chromium` once).

import { chromium } from 'playwright';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import config from '../src/config.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

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
    files.find((f) => f.includes('latin') && f.includes(`-${weight}-${style}`) && f.endsWith('.woff2'));
  if (!match) {
    console.warn(`[build-og] no woff2 found for ${family} ${weight} in @fontsource/${pkg}.`);
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
  ])
).join('');

const bridge = `<svg viewBox="0 0 40 28" width="40" height="28" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21 Q20 3 36 21" stroke="#5BB8F5" stroke-width="3"/><line x1="3" y1="21.5" x2="37" y2="21.5" stroke="#fff" stroke-width="3"/><line x1="13" y1="14" x2="13" y2="21.5" stroke="#fff" stroke-width="2.3"/><line x1="20" y1="10.5" x2="20" y2="21.5" stroke="#fff" stroke-width="2.3"/><line x1="27" y1="14" x2="27" y2="21.5" stroke="#fff" stroke-width="2.3"/></svg>`;

const topics = ['LinkedIn', 'Resumes', 'Interviewing', 'Networking', 'College prep'];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px}
body{font-family:'Inter',system-ui,sans-serif;background:radial-gradient(125% 130% at 86% -12%, #1B3A6B 0%, #0D1B2A 62%);color:#fff;padding:72px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.glow{position:absolute;top:-180px;right:-140px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(91,184,245,.32),transparent 70%)}
.brand{display:flex;align-items:center;gap:14px;font-family:'Manrope';font-weight:800;font-size:32px;z-index:1}
h1{font-family:'Manrope';font-weight:800;font-size:76px;line-height:1.03;letter-spacing:-.02em;max-width:17ch;z-index:1}
.sub{font-size:27px;color:rgba(235,244,252,.85);margin-top:20px;z-index:1}
.row{display:flex;align-items:center;justify-content:space-between;z-index:1;gap:20px}
.chips{display:flex;gap:10px;flex-wrap:wrap}
.chip{font-family:'Manrope';font-weight:700;font-size:18px;color:#cfe8fb;border:1px solid rgba(91,184,245,.42);border-radius:999px;padding:9px 17px}
.handle{font-family:'Manrope';font-weight:800;font-size:27px;color:#5BB8F5;white-space:nowrap}
</style></head><body>
  <div class="glow"></div>
  <div class="brand">${bridge}<span>SkillBridge</span></div>
  <div>
    <h1>The professional skills school skips.</h1>
    <p class="sub">Two high schoolers · free toolkit, no paywalls</p>
  </div>
  <div class="row">
    <div class="chips">${topics.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
    <span class="handle">${config.handle}</span>
  </div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(join(root, 'public'), { recursive: true });
  await page.screenshot({ path: join(root, 'public', 'og.png') });
  console.log('OG image written: public/og.png');
} finally {
  await browser.close();
}
