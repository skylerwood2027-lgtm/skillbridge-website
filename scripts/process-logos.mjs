// Processes the official brand source files (brand-src/) into web-ready assets
// in public/brand/. Reproducible: re-run with `npm run logos` if sources change.
//
// Outputs:
//   wordmark.png        navy wordmark, trimmed, transparent  -> light backgrounds
//   wordmark-white.png  same shape recolored white (alpha-masked) -> dark sections
//   icon.png            book+bridge icon, light-blue bg keyed to transparent
//   favicon-32.png      icon on a white tile (browser tab)
//   apple-touch-icon.png 180px icon on a white tile
//
// Web copies (what the pages load; the PNGs above stay full-size for the PDF and
// OG-card scripts, which need the resolution):
//   wordmark-web.png / wordmark-white-web.png  120px tall (~3x the 34px header logo),
//                                       128-colour palette PNG (~6 KB; beat WebP 4x here)
//   icon.webp                            512px, lossy — it is only ever a faint motif
//   skyler-640.webp / david-640.webp     640w portraits for srcset (1000w stays the source)

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SRC = join(root, 'brand-src');
const OUT = join(root, 'public', 'brand');
await mkdir(OUT, { recursive: true });

// 1) WORDMARK (navy, transparent) — trim the 1024² padding
const wordmarkBuf = await sharp(join(SRC, 'skillbridge-logo-transparent.png'))
  .trim({ threshold: 12 })
  .resize({ height: 240, withoutEnlargement: true })
  .png()
  .toBuffer();
await sharp(wordmarkBuf).toFile(join(OUT, 'wordmark.png'));
const wm = await sharp(wordmarkBuf).metadata();

// 2) WORDMARK (white) — recolor by masking a white canvas with the logo's alpha
const alpha = await sharp(wordmarkBuf).ensureAlpha().extractChannel('alpha').toBuffer();
const whiteBase = await sharp({
  create: { width: wm.width, height: wm.height, channels: 3, background: '#ffffff' },
})
  .png()
  .toBuffer();
await sharp(whiteBase).joinChannel(alpha).png().toFile(join(OUT, 'wordmark-white.png'));

// 3) ICON — chroma-key the light-blue background to transparent, then trim
const { data, info } = await sharp(join(SRC, 'skillbridge-icon.png'))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const ch = info.channels;
const bg = [data[0], data[1], data[2]]; // top-left = background sample
const tol2 = 32 * 32;
for (let i = 0; i < data.length; i += ch) {
  const dr = data[i] - bg[0];
  const dg = data[i + 1] - bg[1];
  const db = data[i + 2] - bg[2];
  if (dr * dr + dg * dg + db * db < tol2) data[i + 3] = 0;
}
const iconBuf = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
  .trim({ threshold: 10 })
  .resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp(iconBuf).toFile(join(OUT, 'icon.png'));

// 4) FAVICONS — the transparent icon centered on a clean white tile
async function tile(size, pad, name) {
  const inner = size - pad * 2;
  const ic = await sharp(iconBuf)
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    .composite([{ input: ic, gravity: 'center' }])
    .png()
    .toFile(join(OUT, name));
}
await tile(32, 3, 'favicon-32.png');
await tile(180, 24, 'apple-touch-icon.png');

// 5) WEB COPIES — sized for how the site actually draws them
const WEB_LOGO_H = 120;
const webLogoPng = { palette: true, colours: 128, effort: 10, dither: 1 };
await sharp(join(OUT, 'wordmark.png')).resize({ height: WEB_LOGO_H }).png(webLogoPng).toFile(join(OUT, 'wordmark-web.png'));
await sharp(join(OUT, 'wordmark-white.png')).resize({ height: WEB_LOGO_H }).png(webLogoPng).toFile(join(OUT, 'wordmark-white-web.png'));
await sharp(iconBuf).webp({ quality: 80, alphaQuality: 90 }).toFile(join(OUT, 'icon.webp'));
for (const name of ['skyler', 'david']) {
  await sharp(join(OUT, `${name}.webp`)).resize({ width: 640 }).webp({ quality: 82 }).toFile(join(OUT, `${name}-640.webp`));
}
const webLogo = await sharp(join(OUT, 'wordmark-web.png')).metadata();

console.log(
  `logos processed -> wordmark ${wm.width}x${wm.height}, white wordmark, icon 512, favicons 32/180, ` +
    `web wordmark ${webLogo.width}x${webLogo.height}, icon.webp, 640w portraits`,
);
