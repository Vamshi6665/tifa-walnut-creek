/**
 * Tifa Walnut Creek flavor catalog.
 *
 * STORE_MENU is the store's own menu data, carried over field-for-field from
 * the original site (index.html on `main`): names, families, tags and allergen
 * flags. Taste profiles are *derived* from the store's tags (TAG_WEIGHTS below),
 * so the Taste Twins map and the quiz only ever reason from what the store says
 * about a flavor. To change the menu, edit STORE_MENU only.
 *
 * Allergen flags keep the original site's meaning:
 *   vegan      true = vegan
 *   dairyFree  true = dairy-free          (was `dairy` on the old site)
 *   gluten     true = CONTAINS gluten
 *   nuts       true = CONTAINS nuts
 *   eggs       true = CONTAINS eggs
 *   noSugar    true = no sugar added
 *   signature  true = Tifa signature flavor
 *
 * `photo` (optional) points at /public/photos/flavors/<id>.jpg once real
 * photos are added; the UI falls back to the color swatch until then.
 */

// [name, family, vegan, signature, gluten, nuts, dairyFree, eggs, noSugar, tags, swatch [a, b, swirl?]]
const STORE_MENU = [
  ['Dark Chocolate', 'chocolate', 0, 0, 0, 0, 0, 0, 0, ['chocolatey', 'rich', 'bittersweet', 'bold'], ['#3B2218', '#55311F']],
  ['Stracciatella', 'classic', 0, 0, 0, 0, 0, 0, 0, ['creamy', 'chocolatey', 'classic', 'sweet'], ['#F3EADB', '#FFF7E8', '#24130C']],
  ['Vanilla Bean', 'classic', 0, 0, 0, 0, 0, 0, 0, ['creamy', 'classic', 'sweet'], ['#FFF1D2', '#FFF9EA']],
  ['Salted Caramel', 'caramel', 0, 0, 0, 0, 0, 0, 0, ['sweet', 'rich', 'caramel', 'salty', 'creamy'], ['#C98A45', '#E0A965', '#7E4317']],
  ['Mint Chip', 'chocolate', 0, 0, 0, 0, 0, 0, 0, ['chocolatey', 'minty', 'refreshing', 'creamy'], ['#B5E8D3', '#D8F5EA', '#24130C']],
  ['Lemon Cookie', 'fruity', 0, 0, 1, 0, 0, 1, 0, ['tart', 'citrus', 'sweet', 'refreshing'], ['#F5E6A0', '#FFF3C4', '#C9A06A']],
  ['Orange Blossom & Olive Oil', 'floral', 0, 0, 0, 0, 0, 0, 0, ['floral', 'citrus', 'creamy', 'sophisticated'], ['#F3DFA8', '#F8EBC6']],
  ['Fig Mascarpone', 'creamy', 0, 0, 0, 0, 0, 0, 0, ['fruity', 'creamy', 'rich', 'sweet'], ['#D9B8B0', '#EAD3CC', '#7A3E5A']],
  ['Cookie Butter', 'caramel', 0, 0, 1, 0, 0, 0, 0, ['sweet', 'spiced', 'caramel', 'rich', 'creamy'], ['#C99A63', '#DDB383', '#8A5A2E']],
  ['Cookies & Cream', 'classic', 0, 0, 1, 0, 0, 1, 0, ['creamy', 'chocolatey', 'sweet', 'classic'], ['#E9E2D8', '#F6F1EA', '#231E1B']],
  ['Cherry Vanilla Black Pepper', 'adventurous', 0, 0, 0, 0, 0, 0, 0, ['fruity', 'spicy', 'creamy', 'bold', 'sophisticated'], ['#E8C8C8', '#F3DADA', '#8B1E3F']],
  ['Milk Chocolate Hazelnut', 'chocolate', 0, 0, 0, 1, 0, 0, 0, ['chocolatey', 'nutty', 'rich', 'creamy', 'sweet'], ['#8A5A3C', '#A5714E']],
  ['Cinnamon Almond Dulce de Leche', 'caramel', 0, 0, 0, 1, 0, 0, 0, ['caramel', 'nutty', 'spiced', 'sweet', 'rich'], ['#C4884E', '#D9A46E', '#7E4517']],
  ['Mango Chamoy Sorbetto', 'fruity', 1, 0, 0, 0, 1, 0, 0, ['fruity', 'tangy', 'spicy', 'refreshing', 'vegan'], ['#F2A33A', '#F7C26A', '#B3261E']],
  ['Gran Cafe', 'coffee', 0, 0, 0, 1, 0, 1, 0, ['coffee', 'bold', 'creamy', 'nutty'], ['#6B4430', '#8A5B40']],
  ["S'mores", 'chocolate', 0, 0, 0, 1, 0, 0, 0, ['chocolatey', 'sweet', 'rich', 'creamy'], ['#6E4A35', '#8C6448', '#F3EADB']],
  ['Stevia Vanilla Bean', 'classic', 0, 0, 0, 0, 0, 0, 1, ['creamy', 'classic', 'sweet'], ['#FFF4DC', '#FFFAEE']],
  ['Guava Cheese Strudel', 'fruity', 0, 0, 1, 0, 0, 0, 0, ['fruity', 'creamy', 'sweet', 'rich'], ['#F2B5A8', '#F8CFC4', '#D9536A']],
  ['Honey Lavender', 'floral', 0, 0, 0, 0, 0, 0, 0, ['floral', 'sweet', 'creamy', 'sophisticated'], ['#CDB8E0', '#DFD0EC']],
  ['Banana Chip', 'classic', 0, 0, 0, 0, 0, 0, 0, ['fruity', 'sweet', 'creamy', 'classic'], ['#F3DE96', '#FAEDC0', '#3B2218']],
  ['Strawberry Rose Sorbetto', 'fruity', 1, 1, 0, 0, 1, 0, 0, ['fruity', 'floral', 'refreshing', 'tart', 'vegan'], ['#E4465F', '#F27A8E']],
  ['Pistachio Lemon Curd', 'nutty', 0, 0, 0, 1, 0, 1, 0, ['nutty', 'tart', 'fruity', 'creamy'], ['#A9B77A', '#C3CC98', '#F2D45C']],
  ['Vegan Almond & Cayenne', 'nutty', 1, 0, 0, 1, 1, 0, 0, ['nutty', 'spicy', 'vegan', 'bold'], ['#E3CDAA', '#EEDDC2', '#C0392B']],
  ['Watermelon Sorbetto', 'fruity', 1, 0, 0, 0, 1, 0, 0, ['fruity', 'refreshing', 'tart', 'vegan'], ['#F25C6E', '#F7889A']],
  ['Lychee Green Tea Latte', 'floral', 0, 1, 0, 0, 0, 0, 0, ['floral', 'tea', 'creamy', 'sophisticated', 'refreshing'], ['#C8D9A8', '#DCE8C4']],
  ['Caramel Macchiato', 'caramel', 0, 0, 0, 0, 0, 0, 0, ['caramel', 'coffee', 'sweet', 'creamy', 'bold'], ['#B98557', '#D0A274', '#6B4430']],
  ['Rocky Road', 'chocolate', 0, 0, 0, 1, 0, 0, 0, ['chocolatey', 'nutty', 'sweet', 'rich'], ['#5A3726', '#734834', '#F6F1EA']],
];

// Birthday flavors exactly as the store set them on the original site
// (some are seasonal and may not be in today's case).
export const BIRTHDAY_FLAVORS = [
  'Dark Chocolate', 'Strawberry Rose Sorbetto', 'Pistachio', 'Lemon Cookie', 'Strawberry Balsamic', 'Lychee Green Tea Latte',
  'Mango Chamoy Sorbetto', 'Vanilla Bean', 'Fig Mascarpone', 'Cherry Vanilla Black Pepper', 'Salted Caramel', 'Peppermint Chip',
];

// ---------------------------------------------------------------------------
// Taste profile, derived from the store's tags
// ---------------------------------------------------------------------------

export const DIMENSIONS = ['sweet', 'creamy', 'fruity', 'nutty', 'cocoa', 'tangy', 'warm', 'fresh', 'floral'];

const DIM_WORDS = {
  sweet: 'sweetness',
  creamy: 'a creamy body',
  fruity: 'bright fruit',
  nutty: 'toasty nuttiness',
  cocoa: 'cocoa depth',
  tangy: 'tang',
  warm: 'warm caramel, coffee and spice notes',
  fresh: 'a cool, fresh finish',
  floral: 'floral notes',
};

export const TRAIT_WORDS = {
  sweet: 'sweet', creamy: 'creamy', fruity: 'fruity', nutty: 'nutty', cocoa: 'chocolatey',
  tangy: 'tangy', warm: 'warm', fresh: 'fresh', floral: 'floral',
};

const TAG_WEIGHTS = {
  chocolatey: { cocoa: 1 },
  bittersweet: { cocoa: 0.6, sweet: -0.3 },
  rich: { creamy: 0.5, sweet: 0.3 },
  bold: { warm: 0.3, cocoa: 0.15 },
  creamy: { creamy: 1 },
  classic: { creamy: 0.35, sweet: 0.25 },
  sweet: { sweet: 1 },
  caramel: { warm: 0.8, sweet: 0.4 },
  salty: { warm: 0.25 },
  minty: { fresh: 1 },
  refreshing: { fresh: 0.8 },
  tart: { tangy: 1 },
  tangy: { tangy: 1 },
  citrus: { tangy: 0.6, fruity: 0.5, fresh: 0.4 },
  floral: { floral: 1, fresh: 0.2 },
  sophisticated: { floral: 0.15, warm: 0.15 },
  fruity: { fruity: 1 },
  spiced: { warm: 1 },
  spicy: { warm: 0.7, tangy: 0.25 },
  nutty: { nutty: 1 },
  coffee: { warm: 0.6, cocoa: 0.45 },
  tea: { fresh: 0.6, floral: 0.3 },
  vegan: {},
};

function profileFromTags(tags, isSorbetto) {
  const p = Object.fromEntries(DIMENSIONS.map((d) => [d, 0]));
  p.creamy = isSorbetto ? 0.1 : 0.35;
  p.sweet = 0.3;
  for (const t of tags) for (const [d, w] of Object.entries(TAG_WEIGHTS[t] ?? {})) p[d] += w;
  return DIMENSIONS.map((d) => Math.max(0, Math.min(1, p[d])));
}

const slug = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const FLAVORS = STORE_MENU.map(([name, family, vegan, signature, gluten, nuts, dairyFree, eggs, noSugar, tags, [a, b, swirl]]) => {
  const kind = /sorbetto/i.test(name) ? 'sorbetto' : 'gelato';
  return {
    id: slug(name),
    name,
    family,
    kind,
    signature: !!signature,
    storeTags: tags.filter((t) => t !== 'vegan'),
    // filterable dietary facts (true = safe for that need)
    tags: { vegan: !!vegan, dairyFree: !!dairyFree, glutenFree: !gluten, nutFree: !nuts },
    contains: { gluten: !!gluten, nuts: !!nuts, eggs: !!eggs },
    noSugar: !!noSugar,
    profile: profileFromTags(tags, kind === 'sorbetto'),
    look: { colorA: a, colorB: b, swirl: swirl ?? b, swirlAmt: swirl ? 0.6 : 0 },
  };
});

export const FLAVOR_BY_ID = Object.fromEntries(FLAVORS.map((f) => [f.id, f]));
export const FLAVOR_BY_NAME = Object.fromEntries(FLAVORS.map((f) => [f.name, f]));

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

/** Build a profile-shaped vector from named weights, e.g. { cocoa: 1, sweet: 0.6 }. */
export function vec(weights) {
  return DIMENSIONS.map((d) => weights[d] ?? 0);
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
 * Used as the default note and as the factual grounding handed to Claude.
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
  const contrast = DIMENSIONS.map((d, i) => ({ d, diff: b.profile[i] - a.profile[i] })).sort((x, y) => y.diff - x.diff)[0];
  const sharedText = shared.length === 2 ? `${shared[0]} and ${shared[1]}` : shared[0] || 'a similar balance';
  const tail =
    contrast && contrast.diff > 0.3 ? ` ${b.name} adds ${DIM_WORDS[contrast.d]}.` : ' They sit close on every axis, so they swap in easily.';
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
  { id: 'refreshing', label: 'Refreshing', target: vec({ fresh: 1, fruity: 0.8, tangy: 0.6, sweet: 0.4 }) },
  { id: 'indulgent', label: 'Indulgent', target: vec({ sweet: 1, creamy: 1, warm: 0.6, cocoa: 0.5 }) },
  { id: 'chocolatey', label: 'Chocolatey', target: vec({ cocoa: 1, creamy: 0.6, sweet: 0.5 }) },
  { id: 'nutty', label: 'Nutty', target: vec({ nutty: 1, creamy: 0.7, sweet: 0.4 }) },
  { id: 'floral', label: 'Floral', target: vec({ floral: 1, creamy: 0.5, fresh: 0.4 }) },
  { id: 'cozy', label: 'Cozy', target: vec({ warm: 1, creamy: 0.8, sweet: 0.6 }) },
];

export function moodPicks(moodId, n = 3) {
  const m = MOODS.find((x) => x.id === moodId);
  if (!m) return [];
  return FLAVORS.map((f) => ({ f, s: cosine(m.target, f.profile) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, n)
    .map((x) => x.f.id);
}
