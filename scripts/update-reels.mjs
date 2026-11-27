// Daily Reel refresh for the homepage. Reads every @realskillbridge Reel's view
// count from the Instagram Graph API, updates src/data/reels.json (views, the
// all-Reels total, any new Reel that reaches the top five) and saves a 540x960
// thumbnail for new ones. The homepage shows the five most-viewed.
//
//   IG_TOKEN=… IG_USER_ID=… node scripts/update-reels.mjs
//   node scripts/update-reels.mjs --fixture media.json   (offline test: [{shortcode, views, caption, thumbnail_url?}])
//
// Run daily by .github/workflows/update-reels.yml. Exits non-zero and leaves
// reels.json alone when Instagram's answer looks wrong, so a bad day never
// reaches the site. Titles already in reels.json are kept; edit them by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(root, 'src', 'data', 'reels.json');
const THUMBS = path.join(root, 'public', 'reels');
const GRAPH = 'https://graph.facebook.com/v27.0';
const HOME_COUNT = 5;

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const shortcodeOf = (url) => (url.match(/\/(?:reel|p)\/([^/?#]+)/) || [])[1];

/** How Instagram's grid writes a count, rounded down: 9,264 · 68K · 1.2M */
export function formatViews(n) {
  if (n >= 1e6) return `${Math.floor(n / 1e5) / 10}M`;
  if (n >= 1e4) return `${Math.floor(n / 1e3)}K`;
  return n.toLocaleString('en-US');
}

/** A card title from a caption: skip the "Comment X…" line, take the first sentence. */
export function titleFromCaption(caption) {
  const lines = caption.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const line = lines.find((l) => !/^comment\b/i.test(l)) ?? lines[0] ?? 'New Reel';
  let t = line.split(/(?<=[.!?])\s/)[0].replace(/[.!]+$/, '');
  t = t.replace(/,\s*part\s+\d+\s*:/i, ':');
  if (t.length > 60) t = `${t.slice(0, 57).replace(/\s+\S*$/, '')}…`;
  return t;
}

export const keywordFromCaption = (caption) => (caption.match(/\b[Cc]omment\s+([A-Z]{3,16})\b/) || [])[1] ?? null;

async function graph(pathOrUrl, token) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${GRAPH}/${pathOrUrl}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    if (attempt >= 3 || res.status < 500) throw new Error(`Instagram API ${res.status}: ${body.error?.message ?? 'no message'}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

/** Every Reel on the account with its view count. */
async function fetchReels(token, igUserId) {
  const reels = [];
  let next = `${igUserId}/media?fields=id,caption,permalink,media_product_type,thumbnail_url,timestamp&limit=50`;
  while (next) {
    const page = await graph(next, token);
    for (const m of page.data ?? []) {
      if (m.media_product_type !== 'REELS') continue;
      const ins = await graph(`${m.id}/insights?metric=views`, token);
      const metric = (ins.data ?? []).find((d) => d.name === 'views');
      const views = metric?.total_value?.value ?? metric?.values?.[0]?.value;
      if (typeof views !== 'number') throw new Error(`no view count for ${m.permalink}`);
      reels.push({ shortcode: shortcodeOf(m.permalink), views, caption: m.caption ?? '', thumbnail_url: m.thumbnail_url });
    }
    next = page.paging?.next ?? null;
  }
  return reels;
}

async function saveThumb(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`thumbnail download failed (${res.status})`);
  const { default: sharp } = await import('sharp');
  await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(540, 960, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(file);
}

async function main() {
  const fixtureArg = process.argv.indexOf('--fixture');
  let live;
  if (fixtureArg > -1) {
    live = JSON.parse(fs.readFileSync(process.argv[fixtureArg + 1], 'utf8'));
  } else {
    const { IG_TOKEN, IG_USER_ID } = process.env;
    if (!IG_TOKEN || !IG_USER_ID) throw new Error('IG_TOKEN and IG_USER_ID must be set');
    live = await fetchReels(IG_TOKEN, IG_USER_ID);
  }

  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const oldTotal = parseInt(String(data.totals.note).match(/was ([\d,]+)/)?.[1]?.replace(/,/g, '') ?? '0', 10);
  const total = live.reduce((s, r) => s + r.views, 0);

  // Sanity checks: a token that lost access or a half-empty answer must not wipe the page.
  if (live.length < 5) throw new Error(`only ${live.length} Reels came back; refusing to update`);
  if (oldTotal && total < oldTotal * 0.5) throw new Error(`total fell from ${oldTotal} to ${total}; refusing to update`);

  const byCode = new Map(live.map((r) => [r.shortcode, r]));
  const changes = [];

  // Update the Reels already on the site.
  for (const entry of data.reels) {
    const r = byCode.get(shortcodeOf(entry.url));
    if (!r) continue;
    const views = formatViews(r.views);
    if (views !== entry.views) {
      changes.push(`${entry.id}: ${entry.views ?? '—'} → ${views}`);
      entry.views = views;
      entry.viewsAsOf = today;
    }
  }

  // Add any Reel that now makes the top five and isn't on the site yet.
  const known = new Set(data.reels.map((e) => shortcodeOf(e.url)));
  const top = [...live].sort((a, b) => b.views - a.views).slice(0, HOME_COUNT);
  for (const r of top) {
    if (known.has(r.shortcode)) continue;
    const id = `reel-${r.shortcode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const thumb = `/reels/${id}.webp`;
    if (!r.thumbnail_url) throw new Error(`new top Reel ${r.shortcode} has no thumbnail`);
    if (!fs.existsSync(path.join(THUMBS, `${id}.webp`))) await saveThumb(r.thumbnail_url, path.join(THUMBS, `${id}.webp`));
    const entry = {
      id,
      title: titleFromCaption(r.caption),
      views: formatViews(r.views),
      viewsAsOf: today,
      url: `https://www.instagram.com/reel/${r.shortcode}/`,
      thumb,
      keyword: keywordFromCaption(r.caption),
    };
    data.reels.push(entry);
    changes.push(`new: ${entry.title} (${entry.views})`);
  }

  const totalLabel = `${formatViews(total)}+`;
  if (totalLabel !== data.totals.reelViews) changes.push(`total: ${data.totals.reelViews} → ${totalLabel}`);
  if (!changes.length) {
    console.log('No change on the site.');
    return;
  }
  data.totals = {
    reelViews: totalLabel,
    asOf: today,
    note: `Sum of views across all ${live.length} Reels from the Instagram API on ${today} was ${total.toLocaleString('en-US')}; shown rounded down.`,
  };
  const n = (v) => (v ? parseFloat(v.replace(/,/g, '')) * ({ K: 1e3, M: 1e6 }[v.replace(/[\d.,]/g, '')] ?? 1) : 0);
  data.reels.sort((a, b) => n(b.views) - n(a.views));
  fs.writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
  console.log(changes.join('\n'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(String(err.message ?? err));
    process.exit(1);
  });
}
