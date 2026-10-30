import { FLAVORS, cosine } from './flavors.js';

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

export function buildTarget(answers) {
  //          sweet creamy fruity nutty cocoa tangy warm fresh
  const t = [0.55, 0.55, 0.25, 0.25, 0.25, 0.2, 0.25, 0.25];
  const add = (v) => v.forEach((x, i) => (t[i] += x));

  // mood sets the flavor family
  if (answers.mood === 'refreshed') add([0, -0.35, 0.7, -0.2, -0.2, 0.55, -0.2, 0.75]);
  else if (answers.mood === 'cozy') add([0.05, 0.35, -0.2, 0.1, 0.05, -0.15, 0.75, -0.2]);
  else if (answers.mood === 'celebrating') add([0.25, 0.35, 0.25, -0.1, 0.25, 0, 0, -0.1]);
  else if (answers.mood === 'adventurous') add([-0.1, 0, 0.1, 0.1, -0.1, 0.15, 0.3, 0.35]);

  // sweetness shifts within the family
  if (answers.sweetness === 'subtle') add([-0.35, -0.05, 0, 0.2, 0.2, 0.2, 0, 0.2]);
  else if (answers.sweetness === 'indulgent') add([0.4, 0.2, 0, 0, 0.1, -0.15, 0.15, -0.15]);

  // craving size picks the weight class
  if (answers.intensity === 'light') add([0, -0.2, 0.25, -0.15, -0.25, 0.15, -0.1, 0.35]);
  else if (answers.intensity === 'medium') add([0, 0.15, 0, 0.55, 0, 0, 0.05, 0]);
  else if (answers.intensity === 'intense') add([0.1, 0.15, 0, 0.1, 0.65, 0, 0.2, -0.2]);

  return t.map((x) => Math.min(1, Math.max(0, x)));
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
