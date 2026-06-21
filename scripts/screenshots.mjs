// Screenshot-review loop. Captures every page at desktop + mobile into .screens/
// so the renders can be reviewed visually after changes.
//
//   npm run shots                 # against http://localhost:4321
//   BASE=http://localhost:4322 npm run shots
//
// Captures the whole page in a single tall viewport (no fullPage stitching, which
// streaks sticky/composited layers in headless Chromium). Animations are disabled
// (prefers-reduced-motion) so scroll-reveal content is shown in its final state.

import puppeteer from 'puppeteer';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const OUT = join(root, '.screens');
const BASE = process.env.BASE || 'http://localhost:4321';

const pages = [
  { name: 'index', path: '/' },
  { name: 'resources', path: '/resources' },
  { name: 'our-story', path: '/our-story' },
];
const viewports = [
  { tag: 'desktop', width: 1440, mobile: false },
  { tag: 'mobile', width: 390, mobile: true },
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
try {
  for (const vp of viewports) {
    for (const p of pages) {
      const page = await browser.newPage();
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.setViewport({ width: vp.width, height: 900, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const h = await page.evaluate(() => Math.min(Math.ceil(document.documentElement.scrollHeight), 12000));
      await page.setViewport({ width: vp.width, height: h, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
      await new Promise((r) => setTimeout(r, 250));
      await page.screenshot({ path: join(OUT, `${p.name}-${vp.tag}.png`) });
      await page.close();
    }
  }
  console.log('screenshots ->', OUT);
} finally {
  await browser.close();
}
