// The shared SkillBridge editorial PDF system (design concept A).
//
// One family identity across every generated guide: a compact branded masthead,
// the span rule carried over from the website, hairline-separated numbered entries
// with a two-column "Best for" / "Pair it with" structure, an integrated action
// button per external link instead of a raw-link dump at the back, and a footer
// carrying the guide title, SkillBridge, the library URL and a page number.
//
// Deliberately NOT optimising for page fill. A clean two-page guide beats a
// cramped one-page guide; `balanceReport` only flags a sheet that is nearly empty.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const LIBRARY_URL = 'joinskillbridge.com/resources';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Readable in print: strip the scheme, keep the path, never let it run long. */
export const showUrl = (u) => esc(u.replace(/^https?:\/\//, '').replace(/\/$/, ''));

export async function loadFonts(root) {
  async function face(family, pkg, weight) {
    const dir = join(root, 'node_modules', '@fontsource', pkg, 'files');
    let files = [];
    try {
      files = await readdir(dir);
    } catch {
      return '';
    }
    const match =
      files.find((f) => f.includes(`-latin-${weight}-normal`) && f.endsWith('.woff2')) ||
      files.find((f) => f.includes('latin') && f.includes(`-${weight}-normal`) && f.endsWith('.woff2'));
    if (!match) {
      console.warn(`[pdf] no woff2 for ${family} ${weight} — falling back to a system font.`);
      return '';
    }
    const b64 = (await readFile(join(dir, match))).toString('base64');
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
  }
  return (
    await Promise.all([
      face('Manrope', 'manrope', 700),
      face('Manrope', 'manrope', 800),
      face('Inter', 'inter', 400),
      face('Inter', 'inter', 600),
      face('Inter', 'inter', 700),
    ])
  ).join('');
}

export async function loadWordmark(root, variant = 'wordmark-white.png') {
  return (await readFile(join(root, 'public', 'brand', variant))).toString('base64');
}

/* Type scale, in points at Letter. Body is 11pt with 1.62 leading — the first pass
   ran 10.2px with 1.36 leading to force one page, which is what made it read as a
   compressed worksheet. */
export const SYSTEM_CSS = `
*,*::before,*::after{box-sizing:border-box}
*{margin:0}
html,body{margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;color:#0D1B2A;font-size:10.8pt;line-height:1.5;orphans:3;widows:3;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:'Manrope',system-ui,sans-serif;color:#1B3A6B;letter-spacing:-.02em;line-height:1.14;font-weight:800}
a{color:#155A8A;text-decoration:none}

/* ---- masthead: compact, branded, one span rule ---- */
.mast{margin-bottom:12pt}
.mast__brand img{height:17pt;width:auto;margin-bottom:9pt}
.mast__k{font-family:'Manrope',sans-serif;font-weight:700;font-size:7.6pt;letter-spacing:.16em;text-transform:uppercase;color:#155A8A}
.mast h1{font-size:23pt;margin-top:4pt;line-height:1.04}
.mast__sub{margin-top:6pt;color:#43567A;font-size:10.6pt;line-height:1.45;max-width:56ch}
.deck{height:2.5pt;background:#EBF4FC;border-radius:2pt;margin-top:12pt;position:relative;overflow:hidden}
.deck i{position:absolute;left:0;top:0;bottom:0;background:#1B3A6B;border-radius:2pt}

.lede{font-size:10.8pt;line-height:1.58;color:#43567A;max-width:66ch}
.lede b{color:#1B3A6B;font-weight:600}

/* ---- entries: hairlines, no boxes ---- */
.list{margin-top:15pt}
.item{padding:9pt 0 10pt;border-top:.75pt solid #DCE8F5;break-inside:auto}
.item__tail{break-inside:avoid}
.item:first-child{border-top:1.5pt solid #1B3A6B}
.item__head{display:grid;grid-template-columns:22pt 1fr;gap:0 10pt;align-items:baseline;break-after:avoid;break-inside:avoid}
.item__n{font-family:'Manrope',sans-serif;font-weight:800;font-size:13pt;color:#5BB8F5;line-height:1}
.item__provider{font-family:'Manrope',sans-serif;font-weight:700;font-size:7.6pt;letter-spacing:.15em;text-transform:uppercase;color:#155A8A}
.item h3{font-size:13pt;margin-top:2pt}
.item__body{margin-left:32pt}
.item__lead{margin-top:5pt;break-after:avoid;font-size:10.6pt;line-height:1.58;color:#43567A;max-width:56ch}
.item__grid{margin-top:7pt;display:grid;grid-template-columns:1fr 1fr;gap:6pt 20pt;break-inside:avoid}
@media all{.item__grid--one{grid-template-columns:1fr}}
.lbl{font-family:'Manrope',sans-serif;font-weight:700;font-size:7.4pt;letter-spacing:.15em;text-transform:uppercase;color:#6B7D97;display:block;margin-bottom:2pt}
.val{font-size:10.2pt;line-height:1.45;color:#43567A}
.val b{color:#1B3A6B;font-weight:600}
.item ul{margin:5pt 0 0;padding:0;list-style:none}
.item li{position:relative;padding:2pt 0 2pt 11pt;font-size:10.4pt;line-height:1.48;color:#43567A}
.item li::before{content:'';position:absolute;left:1pt;top:9pt;width:3pt;height:3pt;border-radius:50%;background:#5BB8F5}

/* ---- integrated action, never a raw-link dump ---- */
.act{margin-top:8pt;break-inside:avoid;display:flex;align-items:baseline;gap:5pt 11pt;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6pt;font-family:'Manrope',sans-serif;font-weight:700;font-size:9.6pt;
  color:#fff;background:#1B3A6B;border-radius:99pt;padding:5pt 12pt}
.btn svg{width:9pt;height:9pt}
.act__url{flex:1 1 46%;min-width:0;font-size:8.4pt;line-height:1.42;color:#6B7D97;overflow-wrap:anywhere}
.act__url b{color:#43567A;font-weight:600}

/* ---- typographic callouts, no outlined box ---- */
.note{margin-top:7pt;padding-left:10pt;border-left:2pt solid #5BB8F5;font-size:10.2pt;line-height:1.48;color:#1B3A6B;max-width:58ch}
.warnline{margin-top:9pt;padding:7pt 11pt;background:#FFF6E3;border-radius:6pt;font-size:10.2pt;line-height:1.5;color:#7A5800;max-width:60ch}

.rule{margin-top:17pt;padding-left:14pt;border-left:3pt solid #1B3A6B;break-inside:avoid}
.rule h2{font-size:13.5pt}
.rule p{margin-top:5pt;font-size:10.8pt;line-height:1.52;color:#43567A;max-width:60ch}
.rule ul{margin:8pt 0 0;padding:0;list-style:none}
.rule li{position:relative;padding:2.4pt 0 2.4pt 13pt;font-size:10.4pt;line-height:1.48;color:#43567A}
.rule li::before{content:'';position:absolute;left:0;top:10pt;width:4pt;height:4pt;border-radius:1pt;background:#5BB8F5}

.verify{margin-top:16pt;padding-top:8pt;border-top:.75pt solid #DCE8F5;font-size:8.6pt;line-height:1.55;color:#6B7D97;max-width:76ch}
.verify b{color:#43567A}
`;

export const EXT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M14 5h5v5"/><path d="M19 5 10 14"/><path d="M18 14v5H5V6h5"/></svg>';

export function footerTemplate(title) {
  return `<div style="width:100%;font-family:'Manrope',sans-serif;font-size:7.4pt;color:#6B7D97;padding:0 0.72in;
      display:flex;justify-content:space-between;align-items:baseline;gap:14px;">
      <span><b style="color:#43567A">${esc(title)}</b> &middot; SkillBridge</span>
      <span style="color:#155A8A">${LIBRARY_URL}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;
}

export const PDF_OPTIONS = (title) => ({
  format: 'Letter',
  printBackground: true,
  margin: { top: '0.66in', bottom: '0.78in', left: '0.72in', right: '0.72in' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: footerTemplate(title),
});

/**
 * How full is the last sheet? Page count comes from the PDF's own page tree, and
 * the flow height is measured at the exact print width. A last sheet under ~18%
 * is the "accidental nearly-empty page" the brief rules out.
 */
export function balanceReport(buf, flowPx) {
  const m = buf.toString('latin1').match(/\/Count (\d+)/);
  const pages = m ? Number(m[1]) : 1;
  const PRINT_H = Math.round((11 - 0.66 - 0.78) * 96);
  const lastFill = Math.min(1, Math.max(0, flowPx - (pages - 1) * PRINT_H) / PRINT_H);
  return { pages, lastFill: Math.round(lastFill * 100) };
}

export const PRINT_W = Math.round((8.5 - 0.72 - 0.72) * 96);
export const PRINT_H = Math.round((11 - 0.66 - 0.78) * 96);
