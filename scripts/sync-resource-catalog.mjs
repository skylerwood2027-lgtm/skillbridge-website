// Writes a verified snapshot of the canonical resource catalog into the content
// repo, where Creator Flow's CTA validation reads it.
//
//   npm run resources:sync
//   SKILLBRIDGE_CONTENT_REPO=D:/skillbridge npm run resources:sync
//   npm run resources:sync -- --check     compare only, write nothing
//
// SOURCE OF TRUTH: skillbridge-website/src/data/resources.json. The snapshot is
// generated and carries two hashes — one over the source file and one over its
// own payload — so the content repo's tests can prove it has not drifted or been
// hand-edited. Never edit the snapshot directly.

import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CONTENT_REPO = process.env.SKILLBRIDGE_CONTENT_REPO || 'C:/skillbridge';
const OUT = join(CONTENT_REPO, 'data', 'skillbridge', 'resource-catalog.json');
const checkOnly = process.argv.includes('--check');

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const sourceText = await readFile(join(root, 'src', 'data', 'resources.json'), 'utf8');
const catalog = JSON.parse(sourceText);
const config = JSON.parse(await readFile(join(root, 'src', 'config.json'), 'utf8'));

const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${config.siteUrl}${url}`);

// Every resource ships, not just the published ones — the pipeline has to be able
// to fail closed on a keyword pointed at something draft or blocked, which it can
// only do if it can see that the resource exists and is not ready.
const payload = {
  updated: catalog.updated,
  libraryUrl: `${config.siteUrl}/resources`,
  resources: catalog.resources.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    title: r.title,
    description: r.description,
    format: r.format,
    action_label: r.action?.label ?? null,
    url: r.action?.url ? absolute(r.action.url) : null,
    cta_keyword: r.cta?.keyword ?? null,
    video_job_id: r.cta?.videoJobId ?? null,
    last_verified: r.lastVerified ?? null,
    blocked_reason: r.blockedReason ?? null,
  })),
};

const snapshot = {
  _generated: {
    note: 'GENERATED FILE — do not hand-edit. Regenerate with `npm run resources:sync` in skillbridge-website.',
    source: 'skillbridge-website/src/data/resources.json',
    source_sha256: sha(sourceText),
    integrity_sha256: sha(JSON.stringify(payload)),
  },
  ...payload,
};

const text = `${JSON.stringify(snapshot, null, 2)}\n`;

try {
  await access(join(CONTENT_REPO, 'data', 'skillbridge'));
} catch {
  console.error(`[sync] content repo not found at ${CONTENT_REPO}/data/skillbridge`);
  console.error('[sync] set SKILLBRIDGE_CONTENT_REPO to the right path.');
  process.exit(1);
}

let existing = null;
try {
  existing = await readFile(OUT, 'utf8');
} catch {}

if (checkOnly) {
  if (existing === text) {
    console.log('[sync] snapshot is in sync with the canonical catalog.');
    process.exit(0);
  }
  console.error('[sync] OUT OF SYNC — run `npm run resources:sync` to regenerate.');
  process.exit(1);
}

if (existing === text) {
  console.log('[sync] already up to date:', OUT);
} else {
  await writeFile(OUT, text, 'utf8');
  console.log('[sync] wrote', OUT);
}
console.log(`[sync] ${payload.resources.length} resources · source_sha256 ${snapshot._generated.source_sha256.slice(0, 12)}…`);
