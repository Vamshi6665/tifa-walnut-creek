/**
 * Flavor catalog + similarity math.
 *
 * ⚠️  SAMPLE DATA. These 27 entries exist so every 3D system (scoop shader,
 * constellation, quiz) renders end-to-end. Before launch, replace FLAVORS with
 * the live Walnut Creek array from the current site and have the store verify
 * every dietary tag. Allergen info must never ship unverified.
 *
 * Shape of each entry
 *   id        stable slug (used in analytics + URLs)
 *   name      display name
 *   kind      'gelato' | 'sorbetto'
 *   tags      { vegan, dairyFree, glutenFree, nutFree }
 *   profile   8 taste dimensions in [0,1], see DIMENSIONS
 *   look      inputs for the procedural scoop shader (see GelatoScoop.jsx)
 */

export const DIMENSIONS = ['sweet', 'creamy', 'fruity', 'nutty', 'cocoa', 'tangy', 'warm', 'fresh'];

const DIM_WORDS = {
  sweet: 'sweetness',
  creamy: 'a creamy body',
  fruity: 'bright fruit',
  nutty: 'toasty nuttiness',
  cocoa: 'cocoa depth',
  tangy: 'tang',
  warm: 'warm caramel-and-spice notes',
  fresh: 'a cool, fresh finish',
};

// Inclusion presets used by the shader: scale = noise frequency, threshold = how sparse.
const INC = {
  none: { scale: 1, threshold: 2, amount: 0 },
  chips: { scale: 9, threshold: 0.62, amount: 1 },
  nuts: { scale: 6.5, threshold: 0.55, amount: 1 },
  seeds: { scale: 24, threshold: 0.78, amount: 1 },
  crumbs: { scale: 12, threshold: 0.5, amount: 1 },
  flecks: { scale: 30, threshold: 0.72, amount: 0.8 },
};

const v = (sweet = 0, creamy = 0, fruity = 0, nutty = 0, cocoa = 0, tangy = 0, warm = 0, fresh = 0) => [
  sweet, creamy, fruity, nutty, cocoa, tangy, warm, fresh,
];

const t = (vegan, dairyFree, glutenFree, nutFree) => ({ vegan, dairyFree, glutenFree, nutFree });

const look = (a, b, { swirl = null, swirlAmt = 0, inc = 'none', incColor = '#000000', sss = null, rough = 0.46 } = {}) => ({
  colorA: a,
  colorB: b,
  swirl: swirl ?? b,
  swirlAmt,
  inclusion: INC[inc],
  incColor,
  sss: sss ?? b,
  rough,
});

export const FLAVORS = [
  { id: 'pistachio', name: 'Pistachio', kind: 'gelato', tags: t(0, 0, 1, 0), profile: v(0.5, 0.8, 0, 1, 0, 0, 0.3, 0.2), look: look('#A9B77A', '#C3CC98', { inc: 'nuts', incColor: '#6B7F3F', sss: '#C8D59A' }) },
  { id: 'dark-chocolate', name: 'Dark Chocolate Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.5, 0.6, 0, 0, 1, 0.1, 0.4, 0), look: look('#3B2218', '#55311F', { sss: '#7A3E22', rough: 0.32 }) },
  { id: 'mango', name: 'Mango Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.7, 0.2, 1, 0, 0, 0.5, 0.1, 0.5), look: look('#F2A33A', '#F7C26A', { sss: '#F5A84A', rough: 0.4 }) },
  { id: 'stracciatella', name: 'Stracciatella', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.6, 1, 0, 0, 0.4, 0, 0.2, 0.1), look: look('#F3EADB', '#FFF7E8', { inc: 'chips', incColor: '#24130C' }) },
  { id: 'hazelnut', name: 'Hazelnut', kind: 'gelato', tags: t(0, 0, 1, 0), profile: v(0.55, 0.85, 0, 1, 0.3, 0, 0.5, 0), look: look('#B98A5E', '#CBA27C', { inc: 'nuts', incColor: '#6F4A2C' }) },
  { id: 'salted-caramel', name: 'Salted Caramel', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.9, 0.9, 0, 0.1, 0.1, 0.15, 0.9, 0), look: look('#C98A45', '#E0A965', { swirl: '#7E4317', swirlAmt: 0.85 }) },
  { id: 'strawberry', name: 'Strawberry Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.7, 0.2, 1, 0, 0, 0.5, 0, 0.4), look: look('#E4465F', '#F27A8E', { inc: 'seeds', incColor: '#7E1529', sss: '#FF6B81', rough: 0.42 }) },
  { id: 'lemon', name: 'Lemon Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.5, 0.15, 0.7, 0, 0, 1, 0, 1), look: look('#F5E26B', '#FFF3A8', { sss: '#FFF08A', rough: 0.45 }) },
  { id: 'espresso', name: 'Espresso', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.45, 0.8, 0, 0.1, 0.2, 0.1, 0.9, 0), look: look('#6B4430', '#8A5B40', { inc: 'flecks', incColor: '#2B170E' }) },
  { id: 'vanilla-bean', name: 'Vanilla Bean', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.7, 1, 0, 0, 0, 0, 0.4, 0.1), look: look('#FFF1D2', '#FFF9EA', { inc: 'seeds', incColor: '#2B1A10', sss: '#FFE7B0' }) },
  { id: 'cookies-cream', name: 'Cookies & Cream', kind: 'gelato', tags: t(0, 0, 0, 1), profile: v(0.8, 0.9, 0, 0, 0.5, 0, 0.3, 0), look: look('#E9E2D8', '#F6F1EA', { inc: 'crumbs', incColor: '#231E1B' }) },
  { id: 'mint-chip', name: 'Mint Chocolate Chip', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.6, 0.85, 0, 0, 0.35, 0, 0, 1), look: look('#B5E8D3', '#D8F5EA', { inc: 'chips', incColor: '#24130C', sss: '#9FF0D0' }) },
  { id: 'coconut', name: 'Coconut', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.6, 0.8, 0.3, 0.1, 0, 0, 0.1, 0.3), look: look('#FAF6EE', '#EFE9DD', { inc: 'flecks', incColor: '#FFFFFF' }) },
  { id: 'raspberry', name: 'Raspberry Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.55, 0.15, 1, 0, 0, 0.8, 0, 0.3), look: look('#B3264F', '#C9496B', { inc: 'seeds', incColor: '#5E0B2B', sss: '#E0577A', rough: 0.4 }) },
  { id: 'tiramisu', name: 'Tiramisu', kind: 'gelato', tags: t(0, 0, 0, 1), profile: v(0.75, 0.95, 0, 0, 0.5, 0, 0.7, 0), look: look('#D7BB98', '#E9D5BA', { swirl: '#4E3020', swirlAmt: 0.6, inc: 'flecks', incColor: '#3A2418' }) },
  { id: 'matcha', name: 'Matcha', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.4, 0.8, 0, 0.1, 0, 0.1, 0.2, 0.6), look: look('#8BB15F', '#A9C982', { sss: '#B9DD8A' }) },
  { id: 'chai', name: 'Masala Chai', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.65, 0.85, 0, 0.1, 0, 0, 1, 0.1), look: look('#C7A27C', '#D9BC98', { inc: 'flecks', incColor: '#6B4226' }) },
  { id: 'banana', name: 'Banana', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.75, 0.8, 0.7, 0, 0, 0.1, 0.2, 0), look: look('#F3DE96', '#FAEDC0') },
  { id: 'dulce', name: 'Dulce de Leche', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(1, 0.95, 0, 0, 0.1, 0, 0.8, 0), look: look('#C4884E', '#D9A46E', { swirl: '#7E4517', swirlAmt: 0.75 }) },
  { id: 'peanut-butter', name: 'Peanut Butter Cup', kind: 'gelato', tags: t(0, 0, 1, 0), profile: v(0.75, 0.9, 0, 0.9, 0.5, 0.05, 0.4, 0), look: look('#C99A5E', '#DDB27A', { inc: 'chips', incColor: '#3B2218' }) },
  { id: 'almond', name: 'Toasted Almond', kind: 'gelato', tags: t(0, 0, 1, 0), profile: v(0.55, 0.85, 0, 0.9, 0, 0, 0.5, 0), look: look('#E3CDAA', '#EEDDC2', { inc: 'nuts', incColor: '#9C6F43' }) },
  { id: 'blood-orange', name: 'Blood Orange Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.55, 0.15, 0.9, 0, 0, 0.8, 0.1, 0.7), look: look('#E14D2A', '#F0794F', { sss: '#FF6A3D', rough: 0.42 }) },
  { id: 'passion-fruit', name: 'Passion Fruit Sorbetto', kind: 'sorbetto', tags: t(1, 1, 1, 1), profile: v(0.6, 0.15, 1, 0, 0, 0.9, 0, 0.6), look: look('#F2B705', '#F7CD3E', { inc: 'seeds', incColor: '#2E2410', sss: '#FFD23F', rough: 0.42 }) },
  { id: 'cheesecake', name: 'Strawberry Cheesecake', kind: 'gelato', tags: t(0, 0, 0, 1), profile: v(0.8, 1, 0.5, 0, 0, 0.4, 0.2, 0), look: look('#FBEFEA', '#FFF7F3', { swirl: '#E4465F', swirlAmt: 0.7, inc: 'crumbs', incColor: '#C9A06A' }) },
  { id: 'cinnamon', name: 'Cinnamon', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.7, 0.85, 0, 0.1, 0, 0, 1, 0), look: look('#D7B48E', '#E6C9A7', { inc: 'flecks', incColor: '#7A4A2A' }) },
  { id: 'black-cherry', name: 'Black Cherry', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.7, 0.7, 0.9, 0, 0.1, 0.4, 0.1, 0), look: look('#7B1E3A', '#9B2D4F', { inc: 'nuts', incColor: '#3D0C1C', sss: '#C2305A' }) },
  { id: 'ube', name: 'Ube', kind: 'gelato', tags: t(0, 0, 1, 1), profile: v(0.7, 0.9, 0.1, 0.1, 0, 0, 0.4, 0), look: look('#7D5BA6', '#9579BE', { sss: '#B48AE8' }) },
];

export const FLAVOR_BY_ID = Object.fromEntries(FLAVORS.map((f) => [f.id, f]));

/** Flavors offered on the hero "specimen rack" (any flavor can be rendered). */
export const HERO_FLAVORS = ['pistachio', 'dark-chocolate', 'mango', 'stracciatella', 'raspberry', 'salted-caramel'];

export const DIETARY = [
  { id: 'vegan', label: 'Vegan', key: 'vegan' },
  { id: 'dairyFree', label: 'Dairy-free', key: 'dairyFree' },
  { id: 'glutenFree', label: 'Gluten-free', key: 'glutenFree' },
  { id: 'nutFree', label: 'Nut-free', key: 'nutFree' },
];

// ---------------------------------------------------------------------------
// Similarity
// ---------------------------------------------------------------------------

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Top-k most similar flavors (cosine over taste profiles). Deterministic. */
export function tasteTwins(id, k = 4, pool = FLAVORS) {
  const base = FLAVOR_BY_ID[id];
  if (!base) return [];
  return pool
    .filter((f) => f.id !== id)
    .map((f) => ({ flavor: f, score: cosine(base.profile, f.profile) }))
    .sort((x, y) => y.score - x.score || x.flavor.name.localeCompare(y.flavor.name))
    .slice(0, k);
}

/** All unique twin edges (i<j) for the constellation, with similarity weights. */
export function twinEdges(k = 4) {
  const seen = new Set();
  const edges = [];
  FLAVORS.forEach((f, i) => {
    tasteTwins(f.id, k).forEach(({ flavor, score }) => {
      const j = FLAVORS.indexOf(flavor);
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ a: Math.min(i, j), b: Math.max(i, j), score });
      }
    });
  });
  return edges;
}

/**
 * Plain-language reason two flavors pair, derived only from their profiles.
 * Used as the default "AI note" and as the factual grounding we hand to Claude.
 */
export function pairingReason(aId, bId) {
  const a = FLAVOR_BY_ID[aId];
  const b = FLAVOR_BY_ID[bId];
  if (!a || !b) return '';
  const shared = DIMENSIONS.map((d, i) => ({ d, s: Math.min(a.profile[i], b.profile[i]) }))
    .filter((x) => x.s >= 0.35)
    .sort((x, y) => y.s - x.s)
    .slice(0, 2)
    .map((x) => DIM_WORDS[x.d]);
  const contrast = DIMENSIONS.map((d, i) => ({ d, diff: b.profile[i] - a.profile[i] }))
    .sort((x, y) => y.diff - x.diff)[0];
  const sharedText = shared.length === 2 ? `${shared[0]} and ${shared[1]}` : shared[0] || 'a similar balance';
  const tail = contrast && contrast.diff > 0.3 ? ` ${b.name} adds ${DIM_WORDS[contrast.d]}.` : ' They sit close on every axis, so they swap in easily.';
  return `Both lean on ${sharedText}.${tail}`;
}

export function topTraits(id, n = 3) {
  const f = FLAVOR_BY_ID[id];
  if (!f) return [];
  return DIMENSIONS.map((d, i) => ({ d, w: f.profile[i] }))
    .sort((x, y) => y.w - x.w)
    .slice(0, n)
    .map((x) => x.d);
}

// Mood chips for instant picks in Taste Twins.
export const MOODS = [
  { id: 'refreshing', label: 'Refreshing', target: v(0.5, 0.2, 0.9, 0, 0, 0.8, 0, 1) },
  { id: 'indulgent', label: 'Indulgent', target: v(1, 1, 0, 0.2, 0.5, 0, 0.8, 0) },
  { id: 'chocolatey', label: 'Chocolatey', target: v(0.6, 0.7, 0, 0.1, 1, 0, 0.4, 0) },
  { id: 'nutty', label: 'Nutty', target: v(0.5, 0.85, 0, 1, 0.2, 0, 0.5, 0) },
  { id: 'fruity', label: 'Fruity', target: v(0.6, 0.2, 1, 0, 0, 0.6, 0, 0.5) },
  { id: 'cozy', label: 'Cozy', target: v(0.7, 0.9, 0, 0.1, 0.1, 0, 1, 0) },
];

export function moodPicks(moodId, n = 3) {
  const m = MOODS.find((x) => x.id === moodId);
  if (!m) return [];
  return FLAVORS.map((f) => ({ f, s: cosine(m.target, f.profile) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, n)
    .map((x) => x.f.id);
}
