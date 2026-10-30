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
const manifest = {
  generatedAt: new Date().toISOString(),
  // placeholder labels are shown everywhere except Vercel production
  showPlaceholders: process.env.VERCEL_ENV !== 'production',
  brand: { logo: brand.logo ?? null, logoWhite: brand['logo-white'] ?? null },
  photos,
  cutouts: list('photos/cutouts'),
  flavors: byId(list('photos/flavors')),
  gallery: list('photos/gallery').map((x) => x.src),
};
writeFileSync(join(ROOT, 'content/media.generated.json'), JSON.stringify(manifest, null, 2) + '\n');
const n = Object.keys(photos).length + manifest.cutouts.length + Object.keys(manifest.flavors).length + manifest.gallery.length;
console.log(`[media] logo: ${manifest.brand.logo ? 'yes' : 'missing'}, ${n} photo(s)`);
