// Validates src/data/resources.json — the canonical resource catalog — and
// proves every action a visitor can see actually resolves to something.
//
//   npm run resources:check          schema + local files + rendered-action audit
//   npm run resources:check -- --links   also opens every external URL in Chromium
//
// Fails closed. A published resource with a missing file, a dead action, a
// duplicate CTA keyword, or an unknown category is an error, not a warning.
// It also writes src/data/resource-stats.json so the page can state a real page
// count and file size instead of a hand-typed one that could drift.

import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CATALOG = join(root, 'src', 'data', 'resources.json');
const STATS = join(root, 'src', 'data', 'resource-stats.json');
const PUBLIC = join(root, 'public');

const checkLinks = process.argv.includes('--links');
const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));
const { resources, categories, formats, friction, groups } = catalog;

const STATUSES = new Set(['published', 'draft', 'blocked']);
const categoryIds = new Set(categories.map((c) => c.id));
const groupIds = new Set(groups.map((g) => g.id));
const formatIds = new Set(Object.keys(formats));
const frictionIds = new Set(Object.keys(friction));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- schema
const seenId = new Map();
const seenSlug = new Map();
const seenKeyword = new Map();

for (const r of resources) {
  const at = `resource "${r.id ?? '(no id)'}"`;

  for (const field of ['id', 'slug', 'status', 'title', 'description', 'outcome', 'category', 'format', 'group', 'bestFor']) {
    if (!r[field] || typeof r[field] !== 'string') fail(`${at}: missing or non-string "${field}"`);
  }
  if (!STATUSES.has(r.status)) fail(`${at}: status "${r.status}" is not published/draft/blocked`);
  if (!categoryIds.has(r.category)) fail(`${at}: unknown category "${r.category}"`);
  if (!groupIds.has(r.group)) fail(`${at}: unknown group "${r.group}"`);
  if (r.group === 'all') fail(`${at}: "all" is the reset control, not a real group`);
  if ((r.bestFor || '').length > 34) fail(`${at}: bestFor is ${r.bestFor.length} chars — keep it to one short line (<=34)`);

  // Search synonyms are optional, but when present they must actually be usable:
  // a nonempty array of unique, nonempty strings. They never render, so a typo
  // here would silently make a resource unfindable.
  if ('searchTerms' in r) {
    const t = r.searchTerms;
    if (!Array.isArray(t) || t.length === 0) {
      fail(`${at}: searchTerms must be a nonempty array`);
    } else if (!t.every((v) => typeof v === 'string' && v.trim())) {
      fail(`${at}: searchTerms must contain only nonempty strings`);
    } else if (new Set(t.map((v) => v.trim().toLowerCase())).size !== t.length) {
      fail(`${at}: searchTerms has duplicate entries`);
    }
  } else if (r.status === 'published') {
    warn(`${r.id}: no searchTerms — students searching their own words may miss it`);
  }
  if (!formatIds.has(r.format)) fail(`${at}: unknown format "${r.format}"`);
  if (!/^[a-z0-9-]+$/.test(r.slug || '')) fail(`${at}: slug must be lowercase-kebab (got "${r.slug}")`);

  if (seenId.has(r.id)) fail(`duplicate id "${r.id}"`);
  seenId.set(r.id, r);
  if (seenSlug.has(r.slug)) fail(`duplicate slug "${r.slug}"`);
  seenSlug.set(r.slug, r);

  for (const f of r.friction ?? []) {
    if (!frictionIds.has(f)) fail(`${at}: unknown friction label "${f}"`);
  }

  // One keyword maps to exactly one primary resource. Collisions would make the
  // Instagram DM ambiguous, so they are a hard error.
  const kw = r.cta?.keyword;
  if (kw) {
    if (!/^[A-Z]{3,16}$/.test(kw)) fail(`${at}: cta.keyword "${kw}" must be 3-16 uppercase letters`);
    if (seenKeyword.has(kw)) fail(`CTA keyword collision: "${kw}" is claimed by both "${seenKeyword.get(kw)}" and "${r.id}"`);
    seenKeyword.set(kw, r.id);
    if (r.status !== 'published') {
      fail(`${at}: carries CTA keyword "${kw}" but status is "${r.status}" — a keyword cannot ship against a non-published resource`);
    }
    if (!r.cta.videoJobId) fail(`${at}: cta.keyword "${kw}" has no videoJobId`);
  }

  if (r.status === 'published') {
    if (!r.action?.url) fail(`${at}: published with no action.url — a card with nothing to do must not be published`);
    if (!r.action?.label) fail(`${at}: published with no action.label`);
    if (!ISO.test(r.lastVerified || '')) fail(`${at}: published without a valid lastVerified date`);
    if (r.blockedReason) fail(`${at}: published but still carries blockedReason`);
  } else {
    if (!r.blockedReason && r.status === 'blocked') fail(`${at}: blocked with no blockedReason`);
  }
}

// ------------------------------------------------- local files really exist
const stats = {};
for (const r of resources) {
  const urls = [r.action?.url, r.readOnline?.url].filter(Boolean);
  for (const url of urls) {
    if (!url.startsWith('/')) continue;
    if (url === '/resources/skillbridge-starter-toolkit' || !/\.[a-z0-9]+$/i.test(url)) continue; // a page, not a file
    const file = join(PUBLIC, url.replace(/^\//, ''));
    try {
      const s = await stat(file);
      if (r.status === 'published') {
        const entry = (stats[r.id] ??= {});
        entry.bytes = s.size;
        entry.sizeLabel = s.size >= 1024 * 1024
          ? `${(s.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.round(s.size / 1024)} KB`;
        if (url.endsWith('.pdf')) {
          const buf = await readFile(file, 'latin1');
          const m = buf.match(/\/Count (\d+)/);
          if (m) entry.pages = Number(m[1]);
          if (!/\/Type\s*\/Font/.test(buf)) warn(`${r.id}: PDF has no embedded font objects`);
        }
      }
    } catch {
      fail(`resource "${r.id}": action points at ${url} but public${url} does not exist`);
    }
  }
}

// --------------------------------------------- no inert affordance can render
for (const r of resources) {
  if (r.status !== 'published' && r.action?.url) {
    // Allowed in the catalog (it records the intended action), but the page must
    // never render it. Guarded here so the rule is testable, not just a promise.
    if (!r.blockedReason) fail(`resource "${r.id}": non-published with an action but no blockedReason to explain it`);
  }
}

const published = resources.filter((r) => r.status === 'published');
if (!published.length) fail('catalog has no published resources');
const visible = groups.filter((g) => g.id === 'all' || published.some((r) => r.group === g.id));
if (visible.length > 5) fail(`${visible.length} visible filters (incl. All) — four groups plus All is the ceiling`);
for (const g of groups) {
  if (g.id !== 'all' && !published.some((r) => r.group === g.id)) {
    warn(`group "${g.id}" has no published resource and will not render`);
  }
}
if (!published.some((r) => r.featured)) warn('no featured resource — the page will have no "start here" card');

// ---------------------------------------------------------- external links
if (checkLinks) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const external = [];
  for (const r of published) {
    for (const url of [r.action?.url, r.readOnline?.url].filter(Boolean)) {
      if (/^https?:\/\//.test(url)) external.push({ id: r.id, url });
    }
  }
  for (const { id, url } of external) {
    const page = await ctx.newPage();
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const code = res?.status() ?? 0;
      if (code >= 400 || code === 0) fail(`${id}: external action returned HTTP ${code} — ${url}`);
      else console.log(`  link ok  ${code}  ${url}`);
    } catch (e) {
      fail(`${id}: external action failed to load — ${url} (${String(e).split('\n')[0]})`);
    }
    await page.close();
  }
  await browser.close();
}

// ----------------------------------------------------------------- output
await writeFile(STATS, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

const byStatus = resources.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log(
  `\n[resources] ${resources.length} catalogued — ` +
    Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(', ')
);
console.log(`[resources] visible filters: ${visible.map((g) => g.label).join(', ')}`);
console.log(`[resources] CTA keywords: ${[...seenKeyword.keys()].join(', ') || '(none)'}`);
console.log(`[resources] stats -> src/data/resource-stats.json`);

for (const w of warnings) console.warn(`  warn  ${w}`);
if (errors.length) {
  console.error(`\n[resources] FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  error ${e}`);
  process.exit(1);
}
console.log('[resources] OK\n');
