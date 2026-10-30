import { FLAVORS, cosine, vec } from './flavors.js';

/**
 * Deterministic flavor matcher for the Particle Collider quiz.
 * The match is always computed here, from the catalog, so the result can never
 * be a flavor that isn't on the menu. AI (optional) only writes the blurb.
 */

export const QUESTIONS = [
  {
    id: 'dietary',
    title: 'Anything we should steer around?',
    hint: 'Pick all that apply. Please confirm allergens with our team in store.',
    multi: true,
    options: [
      { id: 'vegan', label: 'Vegan' },
      { id: 'dairyFree', label: 'Dairy-free' },
      { id: 'glutenFree', label: 'Gluten-free' },
      { id: 'nutFree', label: 'Nut-free' },
    ],
    emptyLabel: 'No restrictions',
  },
  {
    id: 'sweetness',
    title: 'How sweet today?',
    options: [
      { id: 'subtle', label: 'Barely sweet', phrase: 'barely sweet' },
      { id: 'balanced', label: 'Balanced', phrase: 'balanced sweetness' },
      { id: 'indulgent', label: 'Full dessert mode', phrase: 'full dessert mode' },
    ],
  },
  {
    id: 'mood',
    title: 'What kind of moment is this?',
    options: [
      { id: 'refreshed', label: 'Cooling off', phrase: 'something cooling' },
      { id: 'cozy', label: 'Slow and cozy', phrase: 'something slow and cozy' },
      { id: 'celebrating', label: 'Celebrating', phrase: 'a celebration' },
      { id: 'adventurous', label: 'Surprise me', phrase: 'a surprise' },
    ],
  },
  {
    id: 'intensity',
    title: 'How big is the craving?',
    options: [
      { id: 'light', label: 'A light taste', phrase: 'a light taste' },
      { id: 'medium', label: 'A proper scoop', phrase: 'a proper scoop' },
      { id: 'intense', label: 'Go all in', phrase: 'going all in' },
    ],
  },
];

// Stream colors per question (Neon Rose Gold, Cyber Mint, Electric Vanilla, Chrome-lilac)
export const STREAM_COLORS = ['#FF9EAA', '#50E3C2', '#FFF7D6', '#B9A6FF'];

const SWEET = { subtle: 0.35, balanced: 0.62, indulgent: 0.95 };

/** "balanced sweetness, a celebration and going all in" */
export function describeAnswers(answers) {
  const parts = ['sweetness', 'mood', 'intensity']
    .map((k) => QUESTIONS.find((q) => q.id === k)?.options.find((o) => o.id === answers[k])?.phrase)
    .filter(Boolean);
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// Named nudges per answer; summed onto a neutral base, then clamped to [0, 1].
const BASE = { sweet: 0.55, creamy: 0.5, fruity: 0.25, nutty: 0.2, cocoa: 0.25, tangy: 0.2, warm: 0.25, fresh: 0.25, floral: 0.15 };
const NUDGES = {
  mood: {
    refreshed: { creamy: -0.3, fruity: 0.7, tangy: 0.55, fresh: 0.75, warm: -0.2, cocoa: -0.2, nutty: -0.15 },
    cozy: { creamy: 0.35, warm: 0.75, fruity: -0.2, fresh: -0.2, tangy: -0.15, nutty: 0.1 },
    celebrating: { sweet: 0.25, creamy: 0.35, cocoa: 0.3, fruity: 0.2 },
    adventurous: { floral: 0.4, warm: 0.3, tangy: 0.2, sweet: -0.1, fresh: 0.2 },
  },
  sweetness: {
    subtle: { sweet: -0.35, nutty: 0.2, cocoa: 0.15, tangy: 0.2, floral: 0.15 },
    indulgent: { sweet: 0.4, creamy: 0.2, warm: 0.15, tangy: -0.15 },
  },
  intensity: {
    light: { creamy: -0.2, fruity: 0.25, cocoa: -0.25, fresh: 0.35, tangy: 0.15 },
    medium: { nutty: 0.45, creamy: 0.15 },
    intense: { cocoa: 0.6, warm: 0.25, sweet: 0.1, fresh: -0.2 },
  },
};

export function buildTarget(answers) {
  const t = { ...BASE };
  for (const key of ['mood', 'sweetness', 'intensity']) {
    for (const [d, w] of Object.entries(NUDGES[key][answers[key]] ?? {})) t[d] += w;
  }
  return vec(Object.fromEntries(Object.entries(t).map(([d, w]) => [d, Math.min(1, Math.max(0, w))])));
}

export function eligible(dietary = []) {
  return FLAVORS.filter((f) => dietary.every((d) => f.tags[d]));
}

/** Rarity bonus for "Surprise me": favors flavors far from the menu's average. */
function novelty(f, pool) {
  const avg = f.profile.map((_, i) => pool.reduce((s, x) => s + x.profile[i], 0) / pool.length);
  return 1 - cosine(avg, f.profile);
}

export function matchFlavor(answers) {
  const pool = eligible(answers.dietary);
  if (!pool.length) return null;
  const target = buildTarget(answers);
  const ranked = pool
    .map((f) => {
      let s = cosine(target, f.profile);
      if (answers.mood === 'adventurous') s += 0.35 * novelty(f, FLAVORS);
      return { flavor: f, score: s };
    })
    .sort((a, b) => b.score - a.score || a.flavor.name.localeCompare(b.flavor.name));

  const best = ranked[0];
  // Match % = cosine fit between the answers and the flavor's taste profile
  // (without the "surprise me" bonus), so the number means the same thing every time.
  const fit = cosine(target, best.flavor.profile);
  return {
    flavor: best.flavor,
    matchPct: Math.max(50, Math.min(99, Math.round(fit * 100))),
    runnersUp: ranked.slice(1, 3).map((r) => r.flavor),
    poolSize: pool.length,
  };
}
