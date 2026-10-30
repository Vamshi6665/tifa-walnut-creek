import manifest from './media.generated.json';

/** Everything in /public/brand and /public/photos, scanned at build time. */
export const MEDIA = manifest;

export const LOGO = manifest.brand.logo;
export const LOGO_WHITE = manifest.brand.logoWhite ?? manifest.brand.logo;

export const photo = (slot) => manifest.photos[slot] ?? null;
export const flavorPhoto = (id) => manifest.flavors[id] ?? null;

/** What each slot is for (used for placeholder labels and alt text). */
export const SLOTS = {
  hero: { label: 'Hero: the gelato case or counter, landscape', alt: 'The gelato case at Tifa Walnut Creek' },
  storefront: { label: 'Storefront on Locust St', alt: 'Tifa Chocolate & Gelato storefront on Locust Street, Walnut Creek' },
  interior: { label: 'Inside the store, seating', alt: 'Seating inside Tifa Walnut Creek' },
  'llama-wall': { label: 'The llama wall art', alt: 'Llama wall art inside Tifa Walnut Creek' },
  'gelato-case': { label: 'Gelato case close-up', alt: "Today's gelato case" },
  'truffle-case': { label: 'Truffle case by the entrance', alt: 'Handmade truffles in the case by the entrance' },
  'kitchen-window': { label: 'Window into the gelato kitchen', alt: 'The window into the gelato kitchen' },
  chocolates: { label: 'Chocolates and treats', alt: 'Artisan chocolates' },
  drinks: { label: 'Groundwork coffee drinks', alt: 'Coffee drinks made with Groundwork coffee' },
  team: { label: 'Naina and the team (with their OK)', alt: 'Naina and the Tifa Walnut Creek team' },
  catering: { label: 'A catering or event spread', alt: 'Tifa gelato and chocolates at an event' },
};

/**
 * Next's image optimizer URL. Use for WebGL textures so they get the same
 * resizing + WebP/AVIF as <Image>. `w` must be one of Next's configured sizes.
 */
export function optimized(src, w = 1920, q = 82) {
  if (!src || src.endsWith('.svg')) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

export const cutouts = () => manifest.cutouts.filter((c) => c.id !== 'llama');
export const llamaCutout = () => manifest.cutouts.find((c) => c.id === 'llama')?.src ?? null;
