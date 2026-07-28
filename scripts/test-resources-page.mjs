// End-to-end checks for the resource library and the sitewide CTA hierarchy.
//
//   npx astro preview --port 4399
//   BASE=http://localhost:4399 node scripts/test-resources-page.mjs
//
// These assert the structure Skyler asked for, not just that things render:
// one collection with no duplicates, controls before the first result, four
// visible filters, newsletter primary and Discord secondary, no false
// affordances, and working deep links.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const BASE = process.env.BASE || 'http://localhost:4321';
const URL_ = `${BASE}/resources`;

const catalog = JSON.parse(await readFile(join(root, 'src', 'data', 'resources.json'), 'utf8'));
const published = catalog.resources.filter((r) => r.status === 'published');
const notPublished = catalog.resources.filter((r) => r.status !== 'published');

let pass = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL_, { waitUntil: 'networkidle' });

// ------------------------------------------------- 1. one collection, once
console.log('\n[1] one nonduplicated collection');
const ids = await page.$$eval('[data-resource]', (els) => els.map((e) => e.dataset.resource));
check(`exactly ${published.length} resource rows rendered`, ids.length === published.length, `got ${ids.length}`);
check('no resource appears twice', new Set(ids).size === ids.length,
  JSON.stringify(ids.filter((v, i) => ids.indexOf(v) !== i)));
const html = await page.content();
for (const r of notPublished) check(`not rendered: ${r.id}`, !html.includes(`data-resource="${r.id}"`));
check('no leftover shelf headings',
  !/Start here|From our videos|Browse everything/.test(await page.textContent('main')));

// ---------------------------------------- 2. controls before the first result
console.log('\n[2] search and filters come first');
const geom = await page.evaluate(() => {
  const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
  return { search: y('#resource-search'), chips: y('.lib__filters'), count: y('.lib__count'), first: y('[data-resource]'), vh: innerHeight };
});
check('search sits above the first resource', geom.search < geom.first, JSON.stringify(geom));
check('filters sit above the first resource', geom.chips < geom.first);
check('result count sits above the first resource', geom.count < geom.first);
check('search is inside the first viewport', geom.search < geom.vh, `${geom.search} vs ${geom.vh}`);

// ------------------------------------------------------ 3. filter taxonomy
console.log('\n[3] filters');
const chips = await page.$$eval('.lib__chip[data-group]', (els) => els.map((e) => ({ t: e.textContent.trim(), p: e.getAttribute('aria-pressed') })));
check('no more than five visible filters including All', chips.length <= 5, `${chips.length}: ${chips.map((c) => c.t).join(', ')}`);
check('every chip exposes aria-pressed', chips.every((c) => c.p !== null));
check('exactly one chip is pressed', chips.filter((c) => c.p === 'true').length === 1);
check('filters are not styled as a primary CTA', await page.$eval('.lib__chip[aria-pressed="false"]', (e) => {
  const bg = getComputedStyle(e).backgroundColor;
  return bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
}));

// ----------------------------------------------------------- 4. behaviour
console.log('\n[4] search, filter, empty state');
const shown = () => page.$$eval('[data-resource]', (els) => els.filter((e) => e.offsetParent !== null || e.getClientRects().length).length);
const total = await shown();
await page.click('.lib__chip[data-group="apply"]');
await page.waitForTimeout(220);
const filtered = await shown();
check('a filter narrows the list', filtered > 0 && filtered < total, `${filtered} of ${total}`);
check('the count matches what is painted', (await page.textContent('.lib__count')).trim().startsWith(String(filtered)));
check('the URL carries the filter for deep linking', page.url().includes('group=apply'), page.url());

await page.goto(`${BASE}/resources?group=experience`, { waitUntil: 'networkidle' });
await page.waitForTimeout(220);
check('a deep link applies its filter on load',
  (await shown()) === published.filter((r) => r.group === 'experience').length);
check('the deep-linked chip shows as pressed',
  await page.$eval('.lib__chip[data-group="experience"]', (e) => e.getAttribute('aria-pressed') === 'true'));

await page.goto(URL_, { waitUntil: 'networkidle' });
await page.fill('#resource-search', 'podcast');
await page.waitForTimeout(220);
check('empty state appears', await page.isVisible('[data-empty]'));
check('no row is left painted behind the empty state', (await shown()) === 0);
await page.click('[data-reset]');
await page.waitForTimeout(220);
check('reset restores every row', (await shown()) === total);

// ------------------------------------------- 5. newsletter primary, Discord not
console.log('\n[5] CTA hierarchy');
for (const path of ['/', '/resources', '/resources/skillbridge-starter-toolkit']) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const cta = await page.$eval('.site-header__cta', (e) => e.textContent.trim());
  check(`${path}: header CTA is the newsletter`, /brief|newsletter/i.test(cta), cta);
  check(`${path}: exactly one newsletter band`, (await page.$$eval('#newsletter', (e) => e.length)) === 1);
  const discordButtons = await page.$$eval('a', (els) =>
    els.filter((a) => /discord/i.test(a.textContent) && /btn|cta/.test(String(a.className))).length);
  check(`${path}: no Discord button competing as a CTA`, discordButtons === 0, `${discordButtons}`);
  const band = await page.$eval('#newsletter', (e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; });
  check(`${path}: newsletter is a wide band, not a square`, band.w / band.h >= 2.2, `${band.w}x${band.h}`);
}

// ------------------------------------------------- 6. no false affordances
console.log('\n[6] homepage tiles are real links');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const tiles = await page.$$eval('.find__card', (els) => els.map((e) => ({ tag: e.tagName, href: e.getAttribute('href') })));
check('every tile is an anchor with an href', tiles.length > 0 && tiles.every((t) => t.tag === 'A' && t.href));
for (const t of tiles) {
  const res = await page.request.get(BASE + t.href.split('?')[0]);
  check(`tile destination resolves: ${t.href}`, res.status() === 200, `HTTP ${res.status()}`);
}
check('the non-interactive wrapper carries no card styling of its own',
  await page.$$eval('.find__item', (els) => els.every((e) => {
    const cs = getComputedStyle(e);
    return cs.boxShadow === 'none' && cs.borderTopWidth === '0px' &&
      (cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent');
  })));
check('nothing outside an anchor gets the interactive tile treatment',
  await page.$$eval('.find__card', (els) => els.every((e) => e.tagName === 'A')));

// -------------------------------------------------- 7. backward compatibility
console.log('\n[7] old URLs still work');
for (const [label, url] of [
  ['old toolkit page', '/resources/everything-we-use'],
  ['old toolkit PDF', '/everything-we-use.pdf'],
  ['renamed toolkit PDF', '/skillbridge-starter-toolkit.pdf'],
]) {
  const res = await page.request.get(BASE + url);
  check(`${label} resolves (${url})`, res.status() === 200, `HTTP ${res.status()}`);
}

// ----------------------------------------------------------- 8. every action
console.log('\n[8] every action resolves');
await page.goto(URL_, { waitUntil: 'networkidle' });
const anchors = await page.$$eval('main a', (els) => els.map((a) => ({
  href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'),
})));
check('no empty, "#" or javascript: href', anchors.every((a) => a.href && a.href !== '#' && !a.href.startsWith('javascript:')));
check('every target=_blank carries rel=noopener', anchors.filter((a) => a.target === '_blank').every((a) => (a.rel || '').includes('noopener')));
for (const href of [...new Set(anchors.map((a) => a.href).filter((h) => h.startsWith('/')))]) {
  const res = await page.request.get(BASE + href);
  check(`local href serves 200: ${href}`, res.status() === 200, `HTTP ${res.status()}`);
}

// ------------------------------------------------------- 9. accessibility
console.log('\n[9] accessibility');
check('search has a real label', await page.$eval('#resource-search', () =>
  Boolean(document.querySelector('label[for="resource-search"]')?.textContent.trim())));
check('result count is a live region', await page.$eval('.lib__count', (e) => e.getAttribute('role') === 'status'));
check('exactly one h1', (await page.$$eval('main h1', (e) => e.length)) === 1);
check('every "Best for" label and value are separate elements',
  await page.$$eval('.rrow__best', (els) => els.length > 0 && els.every((e) =>
    e.querySelector('.rrow__best-k') && e.querySelector('.rrow__best-v'))));
await page.focus('#resource-search');
let reached = false;
for (let i = 0; i < 40 && !reached; i++) {
  await page.keyboard.press('Tab');
  reached = await page.evaluate(() => document.activeElement?.classList.contains('rrow__link'));
}
check('a resource link is keyboard reachable from search', reached);
check('the focused link shows a visible ring', await page.evaluate(() => {
  const cs = getComputedStyle(document.activeElement);
  return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
}));

// ------------------------------------------------------ 10. responsive
console.log('\n[10] responsive');
for (const w of [1440, 768, 390, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const m = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: innerWidth,
    ctaVisible: Array.from(document.querySelectorAll('.site-header__cta')).some((x) => x.getClientRects().length > 0),
    bestRuns: Array.from(document.querySelectorAll('.rrow__best')).some((e) => {
      const k = e.querySelector('.rrow__best-k').getBoundingClientRect();
      const v = e.querySelector('.rrow__best-v').getBoundingClientRect();
      return Math.abs(v.top - k.top) < 4 && v.left - k.right < 3;
    }),
  }));
  check(`${w}px: no horizontal overflow`, m.doc <= m.win + 1, `${m.doc} vs ${m.win}`);
  check(`${w}px: newsletter CTA visible in the header`, m.ctaVisible);
  check(`${w}px: "Best for" label never runs into its value`, !m.bestRuns);
}

// ------------------------------------------- 11. works without JavaScript
console.log('\n[11] no JavaScript');
const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
const p2 = await noJs.newPage();
await p2.goto(URL_, { waitUntil: 'domcontentloaded' });
check(`every resource renders with JS off (${published.length})`,
  (await p2.$$eval('[data-resource]', (e) => e.length)) === published.length);
check('every resource link works with JS off',
  await p2.$$eval('.rrow__link', (els) => els.length > 0 && els.every((a) => a.getAttribute('href'))));
await noJs.close();

await browser.close();
console.log(`\n[resources-page] ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  error ${f}`);
  process.exit(1);
}
