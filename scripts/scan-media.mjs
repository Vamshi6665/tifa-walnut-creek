/**
 * Scans /public/brand and /public/photos and writes content/media.generated.json.
 * Runs automatically before `dev` and `build` (npm pre-scripts), so adding a
 * photo is just: drop the file in the right folder, commit, push.
 *
 * Slots (any of .jpg .jpeg .png .webp .avif):
 *   public/brand/logo.*            official Tifa logo (transparent PNG or SVG)
 *   public/brand/logo-white.*      white version for dark backgrounds
 *   public/photos/<slot>.*         hero, storefront, interior, llama-wall, gelato-case,
 *                                  truffle-case, kitchen-window, chocolates, drinks, team, catering
 *   public/photos/cutouts/*.png    gelato cups/scoops with transparent background
 *                                  (name a file after a flavor id to label it, e.g. salted-caramel.png;
 *                                   llama.png becomes the hidden LaMa)
 *   public/photos/flavors/<id>.*   one photo per flavor (see lib/flavors.js ids)
 *   public/photos/gallery/*        extra Instagram-style photos for the gallery strip
 *
 * When the logo is present, its green is sampled (sharp) and becomes the site's
 * accent, so the theme matches the real logo exactly.
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');
const IMG = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);

function list(dir) {
  const abs = join(PUBLIC, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => IMG.has(extname(f).toLowerCase()) && statSync(join(abs, f)).isFile())
    .sort()
    .map((f) => ({ id: basename(f, extname(f)).toLowerCase(), src: `/${dir}/${f}` }));
}

const byId = (items) => Object.fromEntries(items.map((x) => [x.id, x.src]));
const brand = byId(list('brand'));
const photos = byId(list('photos'));
// ---- Tifa green from the real logo ---------------------------------------------
const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mixTo = (c, t, k) => c.map((v, i) => v + (t[i] - v) * k);

async function brandColors(src) {
  if (!src || src.endsWith('.svg')) return null;
  try {
    const { default: sharp } = await import('sharp');
    const { data, info } = await sharp(join(PUBLIC, src)).resize(96, 96, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const buckets = new Map();
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 510;
      const s = max === min ? 0 : (max - min) / 255 / (1 - Math.abs(2 * l - 1));
      if (s < 0.28 || l < 0.12 || l > 0.8) continue;
      let h = 0;
      if (max === r) h = ((g - b) / (max - min)) % 6;
      else if (max === g) h = (b - r) / (max - min) + 2;
      else h = (r - g) / (max - min) + 4;
      h = (h * 60 + 360) % 360;
      if (h < 70 || h > 185) continue; // greens and teals only
      const k = Math.round(h / 10);
      const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++;
      e.r += r;
      e.g += g;
      e.b += b;
      buckets.set(k, e);
    }
    const best = [...buckets.values()].sort((x, y) => y.n - x.n)[0];
    if (!best || best.n < 20) return null;
    const green = [best.r / best.n, best.g / best.n, best.b / best.n];
    const white = [255, 255, 255];
    const deep = [14, 59, 40];
    let ink = green;
    for (let k = 0; k < 1 && contrast(ink, white) < 4.6; k += 0.04) ink = mixTo(green, [0, 0, 0], k);
    let leaf = green;
    for (let k = 0; k < 1 && contrast(leaf, deep) < 7; k += 0.04) leaf = mixTo(green, white, k);
    return { green: hex(green), greenInk: hex(ink), leaf: hex(leaf) };
  } catch (e) {
    console.warn('[media] could not sample the logo color:', e.message);
    return null;
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  // placeholder labels are shown everywhere except Vercel production
  showPlaceholders: process.env.VERCEL_ENV !== 'production',
  brand: { logo: brand.logo ?? null, logoWhite: brand['logo-white'] ?? null, colors: await brandColors(brand.logo) },
  photos,
  cutouts: list('photos/cutouts'),
  flavors: byId(list('photos/flavors')),
  gallery: list('photos/gallery').map((x) => x.src),
};
writeFileSync(join(ROOT, 'content/media.generated.json'), JSON.stringify(manifest, null, 2) + '\n');
const n = Object.keys(photos).length + manifest.cutouts.length + Object.keys(manifest.flavors).length + manifest.gallery.length;
console.log(
  `[media] logo: ${manifest.brand.logo ? 'yes' : 'missing'}${manifest.brand.colors ? ` (green ${manifest.brand.colors.green})` : ''}, ${n} photo(s)`,
);
